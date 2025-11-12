import { useUiStore } from "@/store/useUiStore";

export function MapAttribution() {
  const { mapStyle } = useUiStore();
  
  const getProviderInfo = () => {
    switch (mapStyle) {
      case "satellite":
        return "© Google";
      case "streets":
      case "light":
        return "© CARTO, © OpenStreetMap";
      case "outdoors":
        return "© CARTO, © OpenStreetMap contributors";
      case "dark":
        return "© CARTO";
      default:
        return "© MapLibre, © OpenStreetMap";
    }
  };

  const attribution = getProviderInfo();

  return (
    <div className="absolute bottom-2 right-2 z-10 rounded bg-white/90 px-2 py-1 text-[10px] text-gray-600 shadow-sm backdrop-blur-sm">
      {attribution}
    </div>
  );
}
