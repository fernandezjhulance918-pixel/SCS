import { useEffect, useState } from "react";

export default function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (installed || !installPrompt) return null;

  return (
    <button type="button" onClick={installApp} className="btn btn-outline-success">
      <i className="bi bi-download me-2"></i>
      Install App
    </button>
  );
}
