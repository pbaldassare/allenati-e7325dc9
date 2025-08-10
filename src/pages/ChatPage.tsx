import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chat } from '@/components/Chat';

export default function ChatPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-semibold text-lg">Chat</h1>
      </div>

      {/* Chat Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full">
        <Chat />
      </div>
    </div>
  );
}