import React from "react"
import { Mail, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black text-white py-3 border-t border-gray-800 z-50 shadow-lg">
      <div className="container mx-auto px-4 max-w-full">
        {/* Desktop Layout - Single Row */}
        <div className="hidden md:flex items-center justify-between min-h-[40px]">
          {/* Left: Copyright */}
          <div className="flex items-center flex-shrink-0">
            <p className="text-sm font-medium tracking-wide">
              © 2025{" "}
              <span className="font-bold text-white">KPRCAS</span>
              {" • "}
              Powered by{" "}
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NetCraftStudio
              </span>
            </p>
          </div>
          
          {/* Center: Contact - Compact */}
          <div className="flex items-center justify-center space-x-1 text-xs text-gray-300 flex-shrink min-w-0">
            <Mail className="h-3 w-3 text-blue-400 flex-shrink-0" />
            <a 
              href="mailto:netcraftstudio01@gmail.com" 
              className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium truncate"
            >
              netcraftstudio01@gmail.com
            </a>
          </div>
          
          {/* Right: Built with love */}
          <div className="flex items-center space-x-1 text-xs text-gray-400 flex-shrink-0">
            <span>Built with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse flex-shrink-0" />
            <span>for KPRCAS</span>
          </div>
        </div>

        {/* Mobile Layout - Compact Stacked */}
        <div className="flex md:hidden flex-col items-center justify-center space-y-1 min-h-[50px] text-center">
          {/* Top row: Copyright and Powered by */}
          <div className="flex flex-col items-center space-y-1">
            <p className="text-sm font-medium tracking-wide">
              © 2025{" "}
              <span className="font-bold text-white">KPRCAS</span>
            </p>
            <p className="text-xs text-gray-300">
              Powered by{" "}
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NetCraftStudio
              </span>
            </p>
          </div>
          
          {/* Bottom row: Contact and Built with love */}
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1 text-gray-300">
              <Mail className="h-3 w-3 text-blue-400" />
              <a 
                href="mailto:netcraftstudio01@gmail.com" 
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
              >
                Contact
              </a>
            </div>
            <div className="flex items-center space-x-1 text-gray-400">
              <span>Built with</span>
              <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
              <span>for KPRCAS</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
