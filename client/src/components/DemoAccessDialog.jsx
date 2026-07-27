import { X, Copy, WandSparkles } from 'lucide-react';
import { Button } from './ui';

export default function DemoAccessDialog({
  open,
  title,
  description,
  items,
  onClose,
  onAutofill,
  primaryActionLabel,
  onPrimaryAction,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden animate-slideIn">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-3">
              <WandSparkles size={14} />
              Demo Access
            </div>
            <h2 className="text-2xl font-semibold text-card-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close demo dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.note}</p>
              </div>

              <div className="space-y-2 text-sm">
                {item.values.map((value) => (
                  <div key={value.label} className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 border border-border">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{value.label}</p>
                      <p className="font-medium text-card-foreground break-all">{value.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(value.value)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Copy ${value.label}`}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {onAutofill ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => onAutofill(item)}
                >
                  Autofill Demo
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        {onPrimaryAction ? (
          <div className="p-6 pt-0">
            <Button type="button" variant="outline" className="w-full" onClick={onPrimaryAction}>
              {primaryActionLabel || 'Continue'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}