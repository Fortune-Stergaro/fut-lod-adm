import { useEffect, useState } from "react";

// Shows "Install app" when the browser says the site can be installed (Chrome/Edge/Android). Renders nothing otherwise.
export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e); };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent) return null;
  return (
    <button
      className="min-h-10 cursor-pointer rounded-lg bg-green px-4 text-[0.85rem] font-bold text-white"
      onClick={async () => {
        promptEvent.prompt();
        await promptEvent.userChoice.catch(() => {});
        setPromptEvent(null);
      }}
    >
      Install app
    </button>
  );
}
