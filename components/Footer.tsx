import React from "react"
import { Mail, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-black text-white py-8 mt-auto border-t border-gray-800">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Main Copyright */}
          <div className="text-center">
            <p className="text-base font-medium tracking-wide">
              © 2025{" "}
              <span className="font-bold text-white">KPRCAS</span>
              {" • "}
              Powered by{" "}
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NetCraftStudio
              </span>
            </p>
          </div>
          
          {/* Contact Information */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 text-sm text-gray-300">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-blue-400" />
              <span>Contact us:</span>
            </div>
            <a 
              href="mailto:netcraftstudio01@gmail.com" 
              className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline decoration-1 underline-offset-2 font-medium"
            >
              netcraftstudio01@gmail.com
            </a>
          </div>
          
          {/* Built with love */}
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span>Built with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
            <span>for KPRCAS Community</span>
          </div>
          
          {/* Decorative elements */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-600 to-gray-600"></div>
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <div className="w-16 h-px bg-gradient-to-l from-transparent via-gray-600 to-gray-600"></div>
          </div>
        </div>
      </div>
    </footer>
  )
}
