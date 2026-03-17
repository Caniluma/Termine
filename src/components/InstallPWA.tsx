import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export const InstallPWA: React.FC = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    } else if (isIosDevice) {
      // Show iOS prompt after a short delay if not installed
      setTimeout(() => setShowIOSPrompt(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onClick = async () => {
    if (!promptInstall) {
      return;
    }
    await promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === 'accepted') {
      setSupportsPWA(false);
    }
  };

  if (isInstalled) {
    return null;
  }

  if (isIOS && showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">App installieren</span>
            <span className="text-sm text-slate-500">Für schnelleren Zugriff und Offline-Nutzung</span>
          </div>
          <button onClick={() => setShowIOSPrompt(false)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg flex items-center gap-2">
          <span>Tippen Sie auf das <strong>Teilen-Symbol</strong> unten und wählen Sie <strong>"Zum Home-Bildschirm"</strong>.</span>
        </div>
      </div>
    );
  }

  if (!supportsPWA) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-medium text-slate-900">App installieren</span>
        <span className="text-sm text-slate-500">Für schnelleren Zugriff und Offline-Nutzung</span>
      </div>
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        Installieren
      </button>
    </div>
  );
};
