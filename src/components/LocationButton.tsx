import { useState } from "react";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationButtonProps {
  onLocationFound: (location: { lat: number; lng: number }) => void;
}

export function LocationButton({ onLocationFound }: LocationButtonProps) {
  const [isLocating, setIsLocating] = useState(false);

  const handleLocationClick = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound({ lat: latitude, lng: longitude });
        toast.success("Jumped to your location");
        setIsLocating(false);
      },
      (error) => {
        console.warn("Could not get location:", error.message);
        toast.error("Could not get your location. Please check permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <Button
      onClick={handleLocationClick}
      disabled={isLocating}
      size="icon"
      variant="secondary"
      className="absolute bottom-24 right-4 z-20 h-12 w-12 rounded-full bg-white shadow-xl hover:bg-gray-100 hover:shadow-2xl disabled:opacity-50 transition-all duration-200 border-2 border-gray-200"
      title="Jump to my location"
    >
      <Navigation 
        className={`h-6 w-6 ${isLocating ? 'text-blue-600 animate-pulse' : 'text-gray-800'}`}
        fill={isLocating ? 'currentColor' : 'none'}
        strokeWidth={2.5}
      />
    </Button>
  );
}
