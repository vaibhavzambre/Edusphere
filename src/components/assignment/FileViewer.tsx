import { Document, Page } from 'react-pdf';
import { PDFViewer } from '@react-pdf/renderer';
import { useEffect, useState } from 'react';

export const FileViewer = ({ fileId }) => {
  const [fileInfo, setFileInfo] = useState(null);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      const res = await fetch(`/api/files/${fileId}/metadata`);
      setFileInfo(await res.json());
    };
    fetchMetadata();
  }, [fileId]);

  return (
    <div className="h-[80vh] w-full">
      {fileInfo?.contentType === 'application/pdf' ? (
        <PDFViewer width="100%" height="100%">
          <Document
            file={`/api/files/${fileId}`}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} />
            ))}
          </Document>
        </PDFViewer>
      ) : (
        <iframe 
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + `/api/files/${fileId}`)}&embedded=true`}
          className="w-full h-full"
        />
      )}
    </div>
  );
};