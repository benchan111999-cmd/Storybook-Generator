import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, ExternalLink } from 'lucide-react';

interface ApiKeySelectionProps {
  onKeySelected: () => void;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export function ApiKeySelection({ onKeySelected }: ApiKeySelectionProps) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (selected) {
          onKeySelected();
        }
      }
    };
    checkKey();
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success as per skill instructions to avoid race conditions
      onKeySelected();
    }
  };

  if (hasKey === true) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-none shadow-2xl bg-white/95">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-serif">API Key Required for Nano Banana 2</CardTitle>
          <CardDescription className="text-base">
            To use the higher-quality "Nano Banana 2" model, you need to select a paid Gemini API key from your Google Cloud project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSelectKey}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-6 text-lg rounded-xl transition-all hover:scale-[1.02]"
          >
            Select API Key
          </Button>
          <div className="text-center">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-orange-600 hover:underline inline-flex items-center gap-1"
            >
              Learn about billing <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
