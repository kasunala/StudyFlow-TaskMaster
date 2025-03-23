import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VolumeX, Volume2, Save, Plus } from "lucide-react";

interface YouTubePlayerProps {
  defaultVideoUrl?: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  defaultVideoUrl = "https://www.youtube.com/watch?v=1VUYq36Yu3o" 
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(defaultVideoUrl);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAddNew, setShowAddNew] = useState<boolean>(false);
  const [newVideoUrl, setNewVideoUrl] = useState<string>("");
  const [savedVideos, setSavedVideos] = useState<string[]>([]);
  
  // Parse YouTube URL to get embed URL
  useEffect(() => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      const newEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&mute=${isMuted ? 1 : 0}`;
      setEmbedUrl(newEmbedUrl);
    }
  }, [videoUrl, isMuted]);

  // Load saved videos from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("focusYouTubeVideos");
    if (saved) {
      try {
        const parsedVideos = JSON.parse(saved);
        if (Array.isArray(parsedVideos)) {
          setSavedVideos(parsedVideos);
        }
      } catch (e) {
        console.error("Failed to parse saved videos", e);
      }
    }
  }, []);

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    // Handle different YouTube URL formats
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Save a new video URL
  const handleSaveVideo = () => {
    if (newVideoUrl && extractVideoId(newVideoUrl)) {
      const updatedVideos = [...savedVideos, newVideoUrl];
      setSavedVideos(updatedVideos);
      setVideoUrl(newVideoUrl);
      setNewVideoUrl("");
      setShowAddNew(false);
      
      // Save to localStorage
      localStorage.setItem("focusYouTubeVideos", JSON.stringify(updatedVideos));
    }
  };

  // Select a saved video
  const selectVideo = (url: string) => {
    setVideoUrl(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Focus Video</span>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowAddNew(!showAddNew)}
              title="Add new video"
            >
              <Plus size={20} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* YouTube embed iframe */}
        <div className="aspect-video w-full mb-4">
          {embedUrl && (
            <iframe
              src={embedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-md"
            ></iframe>
          )}
        </div>
        
        {/* Add new video form */}
        {showAddNew && (
          <div className="mb-4 p-3 border rounded-md">
            <Label htmlFor="new-video-url" className="mb-2 block">Add YouTube Video URL</Label>
            <div className="flex gap-2">
              <Input
                id="new-video-url"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1"
              />
              <Button onClick={handleSaveVideo}>
                <Save size={16} className="mr-2" />
                Save
              </Button>
            </div>
          </div>
        )}
        
        {/* Saved videos list */}
        {savedVideos.length > 0 && (
          <div className="mt-4">
            <Label className="mb-2 block">Your Saved Videos</Label>
            <div className="flex flex-wrap gap-2">
              {savedVideos.map((url, index) => (
                <Button
                  key={index}
                  variant={videoUrl === url ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectVideo(url)}
                  className="text-xs"
                >
                  Video {index + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YouTubePlayer; 