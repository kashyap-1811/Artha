import { motion } from "framer-motion";
import { 
  Facebook, Twitter, Instagram, Linkedin, Github, 
  Mail, MapPin, Phone, ArrowUpRight 
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#" },
        { label: "Analytics", href: "/#" },
        { label: "Budgets", href: "/#" },
        { label: "Security", href: "/#" },
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/#" },
        { label: "Careers", href: "/#" },
        { label: "Press", href: "/#" },
        { label: "Contact", href: "/#" },
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/#" },
        { label: "Help Center", href: "/#" },
        { label: "API Reference", href: "/#" },
        { label: "Community", href: "/#" },
      ]
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/#" },
        { label: "Terms of Service", href: "/#" },
        { label: "Cookie Policy", href: "/#" },
        { label: "SLA", href: "/#" },
      ]
    }
  ];

  const socialLinks = [
    { icon: Twitter, href: "#", color: "#1DA1F2" },
    { icon: Linkedin, href: "#", color: "#0A66C2" },
    { icon: Github, href: "#", color: "#181717" },
    { icon: Instagram, href: "#", color: "#E4405F" },
  ];

  return (
    <footer className="relative bg-white/50 backdrop-blur-xl text-zinc-600 py-16 px-6 overflow-hidden border-t border-zinc-200">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                A
              </div>
              <span className="text-2xl font-black text-zinc-900 tracking-tighter">Artha</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              The modern financial operating system for high-growth companies. 
              Track budgets, manage expenses, and gain deep fiscal intelligence 
              with our event-driven architecture.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map(({ icon: Icon, href, color }, idx) => (
                <motion.a
                  key={idx}
                  href={href}
                  whileHover={{ y: -4, color: color, backgroundColor: "rgba(255,255,255,1)" }}
                  className="w-10 h-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center transition-colors shadow-sm"
                >
                  <Icon size={18} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm hover:text-blue-600 transition-colors flex items-center group">
                      {link.label}
                      <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact/Address Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-blue-600">
              <MapPin size={16} />
            </div>
            <span className="text-xs text-zinc-500">Level 42, Financial District, Mumbai, MH 400001</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-blue-600">
              <Mail size={16} />
            </div>
            <span className="text-xs text-zinc-500">hello@artha.io</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-blue-600">
              <Phone size={16} />
            </div>
            <span className="text-xs text-zinc-500">+91 22 4567 8900</span>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-400">
            Artha © {currentYear} — Built with Intelligence by Artha Labs
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Status: All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
