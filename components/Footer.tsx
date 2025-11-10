import React from "react"
import { Mail, Phone } from "lucide-react"

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black text-white py-3 border-t border-gray-800 z-50 shadow-lg">
      <div className="container mx-auto px-4 max-w-full">
        <div className="flex flex-col items-center space-y-2 min-h-[60px]">
          {/* Top: Centered Copyright */}
          <div className="flex items-center justify-center">
            <p className="text-sm font-medium tracking-wide text-center">
              © 2025{" "}
              <span className="font-bold text-white">KPRCAS</span>
              {" "}
              Powered by{" "}
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NetCraftStudio
              </span>
            </p>
          </div>
          
          {/* Bottom: Contact Information */}
          <div className="flex items-center justify-between w-full max-w-md">
            {/* Left: Phone */}
            <div className="flex items-center space-x-1 text-xs text-gray-300">
              <Phone className="h-3 w-3 text-green-400 flex-shrink-0" />
              <a 
                href="tel:+919876543210" 
                className="text-green-400 hover:text-green-300 transition-colors duration-200 font-medium"
              >
                +91 8122696986
              </a>
            </div>
            
            {/* Right: Email */}
            <div className="flex items-center space-x-1 text-xs text-gray-300">
              <Mail className="h-3 w-3 text-blue-400 flex-shrink-0" />
              <a 
                href="mailto:netcraftstudio01@gmail.com" 
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
              >
                netcraftstudio01@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
