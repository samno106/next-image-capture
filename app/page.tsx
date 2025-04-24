"use client";

import { useState } from "react";
import { createWorker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader } from "lucide-react";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [ocrStatus, setOcrStatus] = useState<string>("");

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      setOcrResult(""); // Reset OCR result
      setOcrStatus(""); // Reset status
    }
  };

  const readImageText = async () => {
    if (!selectedImage) return;

    setOcrStatus("Processing");
    const worker = await createWorker(["eng", "khm", "chi_sim"], 3, {
      logger: (m) => console.log(m), // Add logger here
    });

    try {
      const {
        data: { text },
      } = await worker.recognize(selectedImage);

      setOcrResult(text);
      setOcrStatus("Completed");
    } catch (error) {
      console.error(error);
      setOcrStatus("Error occurred during processing.");
    } finally {
      await worker.terminate();
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-2xl font-bold  border-b-4 border-green-500">
          Next Image Capture
        </h1>
        <div className="w-[450px] rounded-md shadow p-4">
          <div className=" space-y-1">
            <h1 className="text-xl font-bold">Documents</h1>
            <h4 className="text-sm font-medium text-gray-500">
              Upload employee identification and work documents
            </h4>
          </div>

          <div className="grid w-full items-center gap-1.5 mt-7">
            <Label htmlFor="picture">Picture of document</Label>
            <Input
              id="picture"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full"
            />
          </div>
          {selectedImage && (
            <div className="p-3 border border-gray-200 mt-4 rounded">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Uploaded content"
                className="rounded"
              />
            </div>
          )}
          <div className="mt-4">
            <Button onClick={readImageText}>Execute</Button>
          </div>

          <div className="border-t mt-5">
            {ocrStatus && (
              <div className=" px-2 py-1 rounded-md border border-slate-200 mt-3">
                <div className="text-xs font-medium flex items-center space-x-1.5">
                  {ocrStatus === "Processing" ? (
                    <Loader className=" size-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className=" size-3.5 text-green-500" />
                  )}

                  <span className=" font-medium text-gray-500">
                    {ocrStatus}
                  </span>
                </div>
              </div>
            )}
            {ocrResult && (
              <div>
                <h3 className="font-semibold mt-5 text-sm">Text Extracted</h3>
                <div className="py-1 px-2 rounded-md bg-slate-50 border border-slate-100 mt-2">
                  <p
                    dangerouslySetInnerHTML={{
                      __html: ocrResult
                        .replace(/\n/g, "<br />")
                        .replace(/[=,—,-,+]/g, " "),
                    }}
                    style={{
                      width: "fit-content",
                    }}
                  />
                  <textarea
                    value={ocrResult.replace(/[=,—,-,+]/g, " ")}
                    onChange={(e) => setOcrResult(e.target.value)}
                    className="w-full mt-4 border p-2 rounded-md"
                  ></textarea>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
