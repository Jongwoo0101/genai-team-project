import { Camera } from 'lucide-react';

export default function CameraBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600/10 border border-emerald-500 text-emerald-400 rounded text-xs font-medium">
      <Camera className="w-3 h-3" />
      Camera ON
    </span>
  );
}
