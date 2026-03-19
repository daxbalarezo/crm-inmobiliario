import React from 'react';
import { Bell, X, Phone, User } from 'lucide-react';

interface Props {
  leadName: string;
  note: string;
  onClose: () => void;
}

export default function ReminderAlert({ leadName, note, onClose }: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-[200] w-80 bg-white border-l-4 border-amber-500 shadow-2xl rounded-xl p-4 animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className="bg-amber-100 p-2 rounded-full text-amber-600">
          <Bell size={20} className="animate-ring" />
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
      <div>
        <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
          <User size={14} className="text-indigo-500"/> {leadName}
        </h4>
        <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">
          {note || 'Tienes una llamada pendiente programada ahora.'}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <button 
          onClick={onClose}
          className="flex-1 bg-amber-500 text-white text-[10px] font-bold py-2 rounded-lg hover:bg-amber-600 flex items-center justify-center gap-1"
        >
          <Phone size={12}/> ATENDER AHORA
        </button>
      </div>
    </div>
  );
}