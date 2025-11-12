import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { geocodeAddress, GeocodingResult } from "@/lib/api/routingService";
import { cn } from "@/lib/utils";

interface LocationSearchProps {
  label: string;
  placeholder: string;
  onLocationSelect: (location: { lat: number; lng: number; name: string }) => void;
  disabled?: boolean;
  className?: string;
}

export function LocationSearch({
  label,
  placeholder,
  onLocationSelect,
  disabled,
  className,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const searchResults = await geocodeAddress(searchQuery);
      setResults(searchResults);
      setShowResults(searchResults.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (result: GeocodingResult) => {
    setSelectedLocation(result.display_name);
    setQuery(result.display_name);
    setShowResults(false);
    onLocationSelect({
      lat: result.lat,
      lng: result.lng,
      name: result.display_name,
    });
  };

  const handleClear = () => {
    setQuery("");
    setSelectedLocation(null);
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
            }}
            disabled={disabled}
            className="pl-9 pr-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {!isSearching && query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
            <div className="max-h-60 overflow-y-auto p-1">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectLocation(result)}
                  className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate font-medium">{result.display_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {result.type} • {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedLocation && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="flex-1 truncate text-primary">{selectedLocation}</span>
        </div>
      )}

      {query.length > 0 && query.length < 3 && (
        <p className="text-xs text-muted-foreground">
          Type at least 3 characters to search
        </p>
      )}
    </div>
  );
}
