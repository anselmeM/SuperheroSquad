import { useState, useEffect } from 'react';
import { 
  FacebookShareButton, TwitterShareButton, WhatsappShareButton, LinkedinShareButton, 
  RedditShareButton, EmailShareButton, TelegramShareButton,
  FacebookIcon, TwitterIcon, WhatsappIcon, LinkedinIcon, 
  RedditIcon, EmailIcon, TelegramIcon 
} from 'react-share';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Check, Copy, Link, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  title: string;
  description?: string;
  hashtags?: string[];
  imageUrl?: string;
  /**
   * Optional URL to share. If not provided, current page URL will be used
   */
  url?: string;
  /**
   * Whether to include a copy to clipboard button
   */
  showCopyLink?: boolean;
  /**
   * Size of social icons in pixels
   */
  iconSize?: number;
  /**
   * Whether to show the share dialog or dropdown
   */
  variant?: 'dialog' | 'dropdown';
  /**
   * Button variant (applies to trigger button)
   */
  buttonVariant?: 'default' | 'secondary' | 'outline' | 'ghost';
  /**
   * Additional element to render inside the share dialog/dropdown
   */
  extraContent?: React.ReactNode;
}

/**
 * Share buttons component for social media sharing
 */
export function ShareButtons({
  title,
  description = 'Check out this superhero profile!',
  hashtags = ['superhero', 'marvel', 'dc'],
  imageUrl,
  url,
  showCopyLink = true,
  iconSize = 32,
  variant = 'dialog',
  buttonVariant = 'outline',
  extraContent
}: ShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Get the current URL when the component mounts
  useEffect(() => {
    // Use the provided URL or the current page URL
    setShareUrl(url || window.location.href);
  }, [url]);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy the link to your clipboard.",
      });
    });
  };
  
  const ShareContent = () => (
    <div className="flex flex-col gap-4">
      {showCopyLink && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">Share Link</div>
          <div className="flex">
            <Input 
              readOnly 
              value={shareUrl} 
              className="flex-1 rounded-r-none"
            />
            <Button 
              onClick={handleCopyLink} 
              variant="outline" 
              className="rounded-l-none border-l-0"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </div>
      )}
      
      <div className="text-sm font-medium">Share on Social Media</div>
      <div className="flex flex-wrap gap-2 justify-start">
                <FacebookShareButton 
          url={shareUrl} 
          hashtag={hashtags?.length ? `#${hashtags[0]}` : undefined}
        >
          <FacebookIcon size={iconSize} round />
        </FacebookShareButton>
        
        <TwitterShareButton url={shareUrl} title={title} hashtags={hashtags}>
          <TwitterIcon size={iconSize} round />
        </TwitterShareButton>
        
        <WhatsappShareButton url={shareUrl} title={title}>
          <WhatsappIcon size={iconSize} round />
        </WhatsappShareButton>
        
        <TelegramShareButton url={shareUrl} title={title}>
          <TelegramIcon size={iconSize} round />
        </TelegramShareButton>
        
        {/* @ts-ignore - type definitions are incomplete */}
        <LinkedinShareButton url={shareUrl} title={title} summary={description} source="Superhero App">
          <LinkedinIcon size={iconSize} round />
        </LinkedinShareButton>
        
        <RedditShareButton url={shareUrl} title={title}>
          <RedditIcon size={iconSize} round />
        </RedditShareButton>
        
        {/* @ts-ignore - type definitions are incomplete */}
        <EmailShareButton url={shareUrl} subject={title} body={`${description}\n\n${shareUrl}`}>
          <EmailIcon size={iconSize} round />
        </EmailShareButton>
      </div>
      
      {extraContent && (
        <div className="mt-2">
          {extraContent}
        </div>
      )}
    </div>
  );
  
  // Render a dialog or dropdown based on the variant prop
  if (variant === 'dialog') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant={buttonVariant} className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {title}</DialogTitle>
            <DialogDescription>
              Share this superhero profile with your friends and family.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <ShareContent />
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[340px] p-4">
        <ShareContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}