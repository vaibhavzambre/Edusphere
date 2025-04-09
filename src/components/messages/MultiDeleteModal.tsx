// src/components/messages/MultiDeleteModal.tsx

import React, { useState } from "react";

export default function MultiDeleteModal({
  isMixed,
  count,
  onClose,
  onDelete,
}: {
  isMixed: boolean;
  count: number;
  onClose: () => void;
  onDelete: (forEveryone: boolean) => void;
}) {
  const [option, setOption] = useState<"me" | "everyone">("me");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Delete {count} message{count > 1 ? "s" : ""}?
        </h2>

        {isMixed ? (
          <>
            <p className="text-sm text-gray-600">
              This has no effect on recipients’ chats.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              You can delete messages for everyone or just for yourself.
            </p>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="radio"
                  name="deleteOption"
                  value="me"
                  checked={option === "me"}
                  onChange={() => setOption("me")}
                />
                <span>Delete for me</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="radio"
                  name="deleteOption"
                  value="everyone"
                  checked={option === "everyone"}
                  onChange={() => setOption("everyone")}
                />
                <span>Delete for everyone</span>
              </label>
            </div>
          </>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(option === "everyone" && !isMixed)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
