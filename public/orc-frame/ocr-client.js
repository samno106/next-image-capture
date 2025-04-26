//Trim canvas alpha and white above 205
const WHITE_POINT = 205;
const trimCanvas = (canvas) => {
  const context = canvas.getContext("2d");
  const copy = document.createElement("canvas").getContext("2d");

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const imgData = context.getImageData(0, 0, imgWidth, imgHeight).data;

  // returns the RGBA values of an x, y coord of imgData
  const getRGBA = (x, y, imgWidth, imgData) => {
    return {
      red: imgData[(imgWidth * y + x) * 4],
      green: imgData[(imgWidth * y + x) * 4 + 1],
      blue: imgData[(imgWidth * y + x) * 4 + 2],
      alpha: imgData[(imgWidth * y + x) * 4 + 3],
    };
  };

  const getAlpha = (x, y, imgWidth, imgData) => {
    const { red, green, blue, alpha } = getRGBA(x, y, imgWidth, imgData);
    return (
      !(red > WHITE_POINT && green > WHITE_POINT && blue > WHITE_POINT) && alpha
    );
  };

  // finds the first y coord in imgData that is not white
  const scanY = (fromTop, imgWidth, imgHeight, imgData) => {
    const offset = fromTop ? 1 : -1;
    const firstCol = fromTop ? 0 : imgHeight - 1;

    // loop through each row
    for (let y = firstCol; fromTop ? y < imgHeight : y > -1; y += offset) {
      // loop through each column
      for (let x = 0; x < imgWidth; x++) {
        // if not white, return col
        if (getAlpha(x, y, imgWidth, imgData)) {
          return y;
        }
      }
    }
    // the whole image is white already
    return null;
  };

  // finds the first x coord in imgData that is not white
  const scanX = (fromLeft, imgWidth, imgHeight, imgData) => {
    const offset = fromLeft ? 1 : -1;
    const firstRow = fromLeft ? 0 : imgWidth - 1;

    // loop through each column
    for (let x = firstRow; fromLeft ? x < imgWidth : x > -1; x += offset) {
      // loop through each row
      for (let y = 0; y < imgHeight; y++) {
        // if not white, return row
        if (getAlpha(x, y, imgWidth, imgData)) {
          return x;
        }
      }
    }

    // the whole image is white already
    return null;
  };

  // get the corners of the relevant content (everything that's not white)
  const cropTop = scanY(true, imgWidth, imgHeight, imgData);
  const cropBottom = scanY(false, imgWidth, imgHeight, imgData);
  const cropLeft = scanX(true, imgWidth, imgHeight, imgData);
  const cropRight = scanX(false, imgWidth, imgHeight, imgData);

  // + 1 is needed because this is a difference, there are n + 1 pixels in
  // between the two numbers inclusive
  const cropXDiff = cropRight - cropLeft + 1;
  const cropYDiff = cropBottom - cropTop + 1;

  // get the relevant data from the calculated coordinates
  const trimmedData = context.getImageData(
    cropLeft,
    cropTop,
    cropXDiff,
    cropYDiff
  );

  // set the trimmed width and height
  copy.canvas.width = cropXDiff;
  copy.canvas.height = cropYDiff;
  // clear the canvas
  copy.clearRect(0, 0, cropXDiff, cropYDiff);
  // place the trimmed data into the cleared canvas to create
  // a new, trimmed canvas
  copy.putImageData(trimmedData, 0, 0);
  return copy.canvas; // for chaining
};

//---------------------------------------------------------------------
var worker = null;

const initWorker = (callback) => {
  var blob = new Blob(
    [window.mrz_worker.toString().replace(/^function .+\{?|\}$/g, "")],
    { type: "text/javascript" }
  );
  var objectURL = URL.createObjectURL(blob);
  worker = new Worker(objectURL);

  worker.addEventListener(
    "error",
    function (e) {
      console.log(e);
    },
    false
  );

  worker.addEventListener(
    "message",
    function (e) {
      var data = e.data;

      switch (data.type) {
        case "progress":
          //console.log(data.msg.substr(0, 1).toUpperCase() + data.msg.substr(1));
          callback({
            scanStatus: "progress",
            data,
          });
          break;

        case "error":
          // console.log("ERROR", data);
          callback({ scanStatus: "error", data });

          break;

        case "result":
          // console.log("Result ", data.result);
          callback({ scanStatus: "success", data: data.result });
          break;

        default:
          console.log(data);
          callback({ scanStatus: "default", data });
          break;
      }
    },
    false
  );

  var pathname = document.location.pathname.split("/");
  pathname.pop();
  pathname = pathname.join("/");

  worker.postMessage({
    cmd: "config",
    config: {
      fsRootUrl: document.location.origin + pathname,
    },
  });

  return worker;
};

const scanImage = (url, callBack = (info) => console.log(info)) => {
  console.log("Scan Image", url);
  const image = new Image();
  image.src = url;
  setTimeout(() => {
    const { naturalHeight, naturalWidth } = image;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    ctx.filter = "grayscale()";
    ctx.drawImage(image, 0, 0);

    const cropCanvas = trimCanvas(canvas);
    // console.log("canvas info", { canvas, cropCanvas });
    const base64Data = cropCanvas.toDataURL();
    // document.body.appendChild(cropCanvas);
    // document.body.appendChild(whiteCrop);
    initWorker(callBack);
    // console.log({ naturalHeight, naturalWidth });
    // console.log(base64Data);
    worker.postMessage({
      cmd: "process",
      image: base64Data,
    });
  }, 500);
};

var pdfjsLib = window.pdfjsLib;
var scanInfo = [];
var totalPages = 0;

const scanPdf = (pdfUrl, callBack = (info) => console.log(info)) => {
  // The workerSrc property shall be specified.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf-js/pdf.worker.js";
  // pdfjsLib = window.pdfjsLib;
  var loadingTask = pdfjsLib.getDocument(pdfUrl);

  const updateScanInfo = (data) => {
    scanInfo.push(data);
    if (totalPages === 1) {
      console.log("#updateScanInfo Only One page in the pdf", scanInfo);
      scanInfo.forEach((scanStatus) => {
        callBack(scanStatus);
      });
    } else {
      // Do callback with passport info
      // Check for multiple passport data if not send the relevant passport data only
      console.log("#updateScanInfo Multiple Pdf Pages", scanInfo);
      //TODO find way to handle multiple pages
    }
  };

  initWorker(updateScanInfo);

  loadingTask.promise.then(
    function (pdf) {
      console.log("PDF loaded", pdf, pdf.numPages);

      // Fetch the first page
      totalPages = pdf.numPages;
      for (let i = 1; i <= totalPages; i++) {
        const pageNumber = i;
        pdf.getPage(pageNumber).then(function (page) {
          console.log("Page loaded");
          var scale = 1;
          var viewport = page.getViewport({ scale: scale });

          // Prepare canvas using PDF page dimensions
          var canvas = document.createElement("canvas");
          var context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          context.filter = "grayscale()";
          // Render PDF page into canvas context
          var renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          var renderTask = page.render(renderContext);
          renderTask.promise.then(function () {
            console.log(`Page ${pageNumber} rendered`);
            const cropPDFCanvas = trimCanvas(canvas);
            document.body.appendChild(cropPDFCanvas);
            console.log({ canvas, cropPDFCanvas });
            worker.postMessage({
              cmd: "process",
              image: cropPDFCanvas.toDataURL(),
            });
          });
        });
      }
    },
    function (reason) {
      // PDF loading error
      console.error(reason);
    }
  );
};

// Event listeners for the Post message handling
var parentEventSource = null;
const receiveMessageFromClient = (evt) => {
  console.log("** receiveMessageFromClient", evt);
  parentEventSource = evt.source;
  if (evt.data) {
    const { action, payload } = evt.data;
    const callback = (data) => {
      console.log("** post callback");
      parentEventSource.postMessage({
        action: "SENDING_OCR_DATA",
        payload: { ocrData: data },
      });
    };
    if (action === "SCAN_IMAGE") {
      scanImage(payload.url, callback);
    }
    if (action === "SCAN_PDF") {
      scanPdf(payload.url, callback);
    }
  }
};

const onloadWindow = () => {
  console.log("** Adding post message event listener to inside iframe");
  window.addEventListener("message", receiveMessageFromClient, false);
};

window.onload = onloadWindow;
