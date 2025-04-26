"use client";

import Script from "next/script";

// import { useState } from "react";
// import { createWorker } from "tesseract.js";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { CheckCircle2, Loader } from "lucide-react";
// import Tesseract from "tesseract.js";

// export default function Home() {
//   const [selectedImage, setSelectedImage] = useState<File | null>(null);
//   const [ocrResult, setOcrResult] = useState<string>("");
//   const [ocrStatus, setOcrStatus] = useState<string>("");

//   const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files && event.target.files[0]) {
//       setSelectedImage(event.target.files[0]);
//       setOcrResult(""); // Reset OCR result
//       setOcrStatus(""); // Reset status
//     }
//   };

//   const readImageText = async () => {
//     if (!selectedImage) return;

//     setOcrStatus("Processing");
//     const worker = await createWorker("eng", 1, {
//       logger: (m) => console.log(m), // Add logger here
//     });

//     try {
//       // const {
//       //   data: { text },
//       // } = await worker.recognize(selectedImage);

//       const result = await Tesseract.recognize(selectedImage, "eng", {
//         logger: (m) => console.log(m),
//       });

//       setOcrResult(result.data.text);
//       setOcrStatus("Completed");
//     } catch (error) {
//       console.error(error);
//       setOcrStatus("Error occurred during processing.");
//     } finally {
//       // await worker.terminate();
//     }
//   };

//   return (
//     <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
//       <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
//         <h1 className="text-2xl font-bold  border-b-4 border-green-500">
//           Next Image Capture
//         </h1>
//         <div className="w-[450px] rounded-md shadow p-4">
//           <div className=" space-y-1">
//             <h1 className="text-xl font-bold">Documents</h1>
//             <h4 className="text-sm font-medium text-gray-500">
//               Upload employee identification and work documents
//             </h4>
//           </div>

//           <div className="grid w-full items-center gap-1.5 mt-7">
//             <Label htmlFor="picture">Picture of document</Label>
//             <Input
//               id="picture"
//               type="file"
//               accept="image/*,.pdf"
//               onChange={handleImageChange}
//               className="w-full"
//             />
//           </div>
//           {selectedImage && (
//             <div className="p-3 border border-gray-200 mt-4 rounded">
//               <img
//                 src={URL.createObjectURL(selectedImage)}
//                 alt="Uploaded content"
//                 className="rounded"
//               />
//             </div>
//           )}
//           <div className="mt-4">
//             <Button onClick={readImageText}>Execute</Button>
//           </div>

//           <div className="border-t mt-5">
//             {ocrStatus && (
//               <div className=" px-2 py-1 rounded-md border border-slate-200 mt-3">
//                 <div className="text-xs font-medium flex items-center space-x-1.5">
//                   {ocrStatus === "Processing" ? (
//                     <Loader className=" size-3 animate-spin" />
//                   ) : (
//                     <CheckCircle2 className=" size-3.5 text-green-500" />
//                   )}

//                   <span className=" font-medium text-gray-500">
//                     {ocrStatus}
//                   </span>
//                 </div>
//               </div>
//             )}
//             {ocrResult && (
//               <div>
//                 <h3 className="font-semibold mt-5 text-sm">Text Extracted</h3>
//                 <div className="py-1 px-2 rounded-md bg-slate-50 border border-slate-100 mt-2">
//                   <p
//                     dangerouslySetInnerHTML={{
//                       __html: ocrResult
//                         .replace(/\n/g, "<br />")
//                         .replace(/[=,—,-,+]/g, " "),
//                     }}
//                     style={{
//                       width: "fit-content",
//                     }}
//                   />
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

import { scanImage } from "../lib/mrz-reader";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const parseDate = (yymmddDate: any) => {
  if (!yymmddDate) {
    return "";
  }
  return moment(yymmddDate, "YYMMDD").format("DD-MMM-YYYY");
};

const preScanImageFirstRender = (imgObject: any) => {
  console.log("imgObject", imgObject);
  if (imgObject) {
    const { clientWidth, clientHeight } = imgObject;
    console.log("imge Parent info", { clientWidth, clientHeight });
    return {
      orentation: clientWidth > clientHeight ? "landscape" : "portrait",
      renderWidth: clientWidth,
      renderHeight: clientHeight,
      width: "not calculated",
      height: "not calculated",
    };
  }

  return {};
};
const IFRAME_PROCESS = true;
export default function Home() {
  const [rotageAngle, setRotateAngle] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [fileData, setFileData] = useState<any>({});
  const [toggleWith, setToggleWidth] = useState({ width: 0, height: 0 });
  const [ocrData, setOcrData] = useState<any>({});
  const inputRef = useRef(null);
  const imgRef = useRef(null);
  const iframeRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const handleOnChange = (evt: any) => {
    evt.preventDefault();
    setOcrData({});
    console.log(evt.target.files[0]);
    if (evt.target.files[0]) {
      setFileData({
        url: URL.createObjectURL(evt.target.files[0]),
        type: evt.target.files[0].type,
      });
    }
  };
  const updateInfo = (info: any) => {
    const { scanStatus, data } = info || {};
    if (scanStatus === "success") {
      if (data && data.parsed && data.parsed.fields) {
        const passportData = { ...data.parsed.fields };
        passportData.birthDate = parseDate(passportData.birthDate);
        passportData.expirationDate = parseDate(passportData.expirationDate);

        setOcrData({ scanStatus, passportData });
      } else {
        setOcrData({ scanStatus, error: "No OCR Information" });
      }
    }

    if (scanStatus === "progress") {
      setOcrData({ scanStatus, status: data });
    }
    if (scanStatus === "error") {
      setOcrData({ scanStatus, error: "Error in file scan" });
    }
    if (scanStatus === "default") {
      setOcrData({ scanStatus, error: "Unknown error" });
    }
    console.log("updateInfo=>", scanStatus, data);

    if (scanStatus !== "progress") {
      setShowPreview(false);
    }
  };

  const processOCR = () => {
    //scanPassport(fileDataURL);
    let postData = {};

    if (fileData) {
      scanImage(fileData.url, updateInfo);
      postData = { action: "SCAN_IMAGE", payload: { url: fileData.url } };
    }

    if (!IFRAME_PROCESS) {
      return false;
    }
    // const iframeContentWindow = iframeRef.current.contentWindow;

    // iframeContentWindow.postMessage(postData);
    console.log("** init post message from the client", postData);
  };
  useEffect(() => {
    if (fileData.url && fileData.url.length > 0) {
      setShowPreview(true);
      setTimeout(() => {
        const { renderWidth: width, renderHeight: height } =
          preScanImageFirstRender(imgRef.current);
        setToggleWidth({ width, height });
      }, 500);
    } else {
      setShowPreview(false);
    }
  }, [fileData]);

  const receiveMessage = (evt: any) => {
    console.log("** receiving from the iframe", evt);
    if (evt.data) {
      const { action, payload } = evt.data || {};
      if (action === "SENDING_OCR_DATA") {
        updateInfo(payload.ocrData);
      }
    }
  };

  useEffect(() => {
    // iframeRef.current.contentWindow.
    setTimeout(() => {
      window.addEventListener("message", receiveMessage, false);
    }, 200);

    return () => {
      window.removeEventListener("message", receiveMessage, false);
    };
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center ">
      <Script src="/mrz-js/mrz-worker.bundle-min-wrapped.js"></Script>
      <Script src="/orc-frame/ocr-client.js"></Script>

      <div className=" space-y-4 pb-10">
        <div className="w-full">
          <h1 className="text-2xl font-bold  border-b-4 border-green-500">
            Next Image Capture
          </h1>
        </div>
        <Input type="file" onChange={handleOnChange} ref={inputRef} />
        {fileData.url ? (
          <div className="img-inner">
            {fileData.type ? (
              <img
                id="previewImage"
                src={fileData.url}
                alt="user uploads"
                ref={imgRef}
                className="w-72 rounded-md p-2 border"
              />
            ) : null}
          </div>
        ) : null}
        {ocrData && ocrData.scanStatus === "success" && ocrData.passportData ? (
          <div
            style={{
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* {JSON.stringify(ocrData.data.parsed.fields)} */}
            <div className=" pt-1">
              {Object.keys(ocrData.passportData).map((itemKey, index) => (
                <div
                  key={index}
                  style={{ display: "flex" }}
                  className="border px-2"
                >
                  <span style={{ width: "250px" }}>{itemKey}</span>
                  <span>{ocrData.passportData[itemKey]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <Button onClick={processOCR}> Process ORC</Button>
        </div>
      </div>
    </div>
  );
}
