export function ExtensionOnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-2xl">
        <h2 className="text-2xl font-bold mb-4">Install the Mirae Extension</h2>
        <p className="text-gray-600 mb-6">
          To automatically track job applications and get Match Scores, you need our Chrome extension.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <span className="bg-orange-100 text-orange-600 h-6 w-6 rounded-full flex items-center justify-center font-bold text-sm">1</span>
            <p className="text-sm">Download the <strong>mirae-extension.zip</strong> file.</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-orange-100 text-orange-600 h-6 w-6 rounded-full flex items-center justify-center font-bold text-sm">2</span>
            <p className="text-sm">Go to <code>chrome://extensions</code> and turn on <strong>Developer Mode</strong>.</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-orange-100 text-orange-600 h-6 w-6 rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <p className="text-sm">Drag and drop the unzipped folder into the browser.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <a 
            href="/path-to-your-zip/mirae-extension.zip" 
            download 
            className="flex-1 bg-[#FCA311] text-black font-bold py-3 rounded-lg text-center hover:bg-[#fdb748]"
          >
            Download Extension
          </a>
          <button onClick={onClose} className="px-6 py-3 text-gray-500 hover:text-black">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
