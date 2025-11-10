import React from "react"
import { Mail, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black text-white py-2 border-t border-gray-800 z-50 shadow-lg">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between space-y-1 lg:space-y-0 min-h-[48px]">
          {/* Main Copyright - Left on desktop, center on mobile */}
          <div className="flex items-center justify-center lg:justify-start order-1 lg:order-1">
            <p className="text-sm font-medium tracking-wide text-center lg:text-left">
              © 2025{" "}
              <span className="font-bold text-white">KPRCAS</span>
              <span className="hidden sm:inline">{" • "}</span>
              <span className="block sm:inline lg:inline">
                Powered by{" "}
                <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  NetCraftStudio
                </span>
              </span>
            </p>
          </div>
          
          {/* Contact Information - Center on desktop, center on mobile */}
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-300 order-2 lg:order-2">
            <Mail className="h-3 w-3 text-blue-400 flex-shrink-0" />
            <span className="whitespace-nowrap">Contact:</span>
            <a 
              href="mailto:netcraftstudio01@gmail.com" 
              className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline decoration-1 underline-offset-2 font-medium truncate"
            >
              netcraftstudio01@gmail.com
            </a>
          </div>
          
          {/* Built with love - Right on desktop, center on mobile */}
          <div className="flex items-center justify-center lg:justify-end space-x-1 text-xs text-gray-400 order-3 lg:order-3">
            <span>Built with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse flex-shrink-0" />
            <span className="whitespace-nowrap">for KPRCAS</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
