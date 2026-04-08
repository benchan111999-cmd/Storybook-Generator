import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Send, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  BookOpen, 
  MessageSquare,
  Trash2,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Character {
  id: string;
  name: string;
  image: string; // base64
}

export default function StorybookGenerator() {
  const [storyline, setStoryline] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingDialogue, setIsGeneratingDialogue] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatHistory]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files);
      fileList.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setCharacters(prev => [
            ...prev,
            { id: Math.random().toString(36).substr(2, 9), name: file.name.split('.')[0], image: base64 }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  const generateDialogue = async () => {
    if (!storyline) return;
    setIsGeneratingDialogue(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Based on this storyline for a storybook page, generate a short, engaging dialogue or narration text (max 3-4 sentences). 
        Storyline: ${storyline}`,
        config: {
          systemInstruction: "You are a professional children's storybook writer. Create whimsical, engaging, and age-appropriate dialogue or narration.",
        }
      });
      setDialogue(response.text || '');
    } catch (error) {
      console.error("Dialogue generation failed:", error);
    } finally {
      setIsGeneratingDialogue(false);
    }
  };

  const generateImage = async (refinementPrompt?: string) => {
    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const parts: any[] = [
        { text: `Create a high-quality, whimsical children's storybook illustration. 
          Scene description: ${storyline}. 
          Dialogue/Narration to incorporate or reflect: ${dialogue}.
          ${refinementPrompt ? `Adjust the previous image based on this feedback: ${refinementPrompt}` : ''}
          Style: Soft watercolors, vibrant but gentle colors, detailed characters.` }
      ];

      // Add character references if available
      characters.forEach(char => {
        parts.push({
          inlineData: {
            data: char.image.split(',')[1],
            mimeType: "image/png"
          }
        });
        parts.push({ text: `Use this character reference for ${char.name}.` });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "4:3"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a helpful assistant for a storybook creator. You help refine image generation prompts based on user feedback. Keep your responses concise and focused on how you will adjust the next image generation.",
        }
      });

      const response = await chat.sendMessage({ message: userMessage });
      const modelResponse = response.text || "I'll help you with that.";
      
      setChatHistory(prev => [...prev, { role: 'model', text: modelResponse }]);
      
      // Automatically trigger image generation with the refinement
      await generateImage(userMessage);
      
    } catch (error) {
      console.error("Chat failed:", error);
    } finally {
      setIsChatting(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `storybook-page-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#4A4A40] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="border-b border-[#E5E2D9] bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[#2D2D2A]">Storyweaver</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50/50 px-3 py-1">
              AI Storybook Studio
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs & Characters */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-[#E5E2D9] shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-[#F9F8F4] border-b border-[#E5E2D9]">
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-orange-600" />
                Character References
              </CardTitle>
              <CardDescription>Upload images to maintain character consistency</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E5E2D9] rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all group"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-[#A1A19A] group-hover:text-orange-500 transition-colors" />
                <p className="text-sm font-medium">Click to upload character images</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              {characters.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <AnimatePresence>
                    {characters.map(char => (
                      <motion.div 
                        key={char.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-[#E5E2D9]"
                      >
                        <img src={char.image} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => removeCharacter(char.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 p-1">
                          <p className="text-[10px] text-white truncate text-center">{char.name}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#E5E2D9] shadow-sm bg-white">
            <CardHeader className="bg-[#F9F8F4] border-b border-[#E5E2D9]">
              <CardTitle className="text-lg font-serif">Storyline</CardTitle>
              <CardDescription>Describe what happens on this page</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Textarea 
                  placeholder="e.g., The brave little fox finds a hidden cave filled with glowing mushrooms..."
                  value={storyline}
                  onChange={(e) => setStoryline(e.target.value)}
                  className="min-h-[120px] resize-none border-[#E5E2D9] focus-visible:ring-orange-500 rounded-xl"
                />
              </div>
              <Button 
                onClick={generateDialogue}
                disabled={!storyline || isGeneratingDialogue}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-6"
              >
                {isGeneratingDialogue ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                Generate Dialogue
              </Button>
            </CardContent>
          </Card>

          {dialogue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-orange-100 shadow-md bg-orange-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wider text-orange-700 font-bold">Dialogue Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-serif italic text-[#2D2D2A] leading-relaxed">
                    "{dialogue}"
                  </p>
                  <Button 
                    onClick={() => generateImage()}
                    disabled={isGeneratingImage}
                    className="w-full mt-4 bg-[#2D2D2A] hover:bg-black text-white rounded-xl py-6"
                  >
                    {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                    Generate Illustration
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column: Preview & Chat */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-[#E5E2D9] shadow-lg bg-white overflow-hidden min-h-[500px] flex flex-col">
            <CardHeader className="bg-[#F9F8F4] border-b border-[#E5E2D9] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-serif">Illustration Preview</CardTitle>
                <CardDescription>Your storybook page comes to life</CardDescription>
              </div>
              {generatedImage && (
                <Button variant="outline" size="sm" onClick={downloadImage} className="rounded-lg border-orange-200 text-orange-700 hover:bg-orange-50">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-6 flex items-center justify-center bg-[#FDFCF8] relative">
              <AnimatePresence mode="wait">
                {isGeneratingImage ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
                      <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-600 w-8 h-8" />
                    </div>
                    <p className="text-lg font-serif italic text-orange-800 animate-pulse">Painting your story...</p>
                  </motion.div>
                ) : generatedImage ? (
                  <motion.div 
                    key="image"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-2xl shadow-2xl rounded-2xl overflow-hidden border-8 border-white"
                  >
                    <img src={generatedImage} alt="Generated storybook page" className="w-full h-auto" referrerPolicy="no-referrer" />
                  </motion.div>
                ) : (
                  <div className="text-center space-y-4 max-w-md">
                    <div className="w-24 h-24 bg-[#F9F8F4] rounded-full flex items-center justify-center mx-auto border border-[#E5E2D9]">
                      <ImageIcon className="w-10 h-10 text-[#A1A19A]" />
                    </div>
                    <p className="text-[#A1A19A] font-serif italic text-lg">
                      Enter a storyline and generate dialogue to start creating your illustration.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Refinement Chatbot */}
          <Card className="border-[#E5E2D9] shadow-md bg-white flex flex-col h-[400px]">
            <CardHeader className="bg-[#F9F8F4] border-b border-[#E5E2D9] py-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-600" />
                Refine Illustration
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                <div className="space-y-4">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-[#A1A19A] italic">
                        Ask for changes like "make the colors warmer" or "add more stars to the sky".
                      </p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                        msg.role === 'user' 
                          ? "bg-orange-600 text-white rounded-tr-none" 
                          : "bg-[#F9F8F4] text-[#4A4A40] border border-[#E5E2D9] rounded-tl-none"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-[#F9F8F4] border border-[#E5E2D9] rounded-2xl rounded-tl-none px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <form onSubmit={handleChatSubmit} className="p-4 border-t border-[#E5E2D9] bg-white flex gap-2">
                <Textarea 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Suggest amendments..."
                  className="min-h-[40px] max-h-[100px] flex-1 border-[#E5E2D9] focus-visible:ring-orange-500 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit(e);
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  disabled={!chatInput.trim() || isChatting || !generatedImage}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl self-end h-10 w-10 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
