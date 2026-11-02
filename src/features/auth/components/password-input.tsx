"use client";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
export const PasswordInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { fieldLabel: string }
>(function PasswordInput({ fieldLabel, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password">
      <input {...props} ref={ref} type={visible ? "text" : "password"} />
      <button
        type="button"
        aria-label={`${visible ? "Hide" : "Show"} ${fieldLabel.toLowerCase()}`}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible(!visible)}
      >
        {visible ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
