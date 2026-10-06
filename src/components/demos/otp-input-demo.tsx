"use client";

import { useEffect, useRef, useState } from "react";
import { OtpInput, type OtpStatus } from "@/components/ui/otp-input";

const DEMO_CODE = "246810";

export default function OtpInputDemo() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [seconds, setSeconds] = useState(30);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const verify = (value: string) => {
    setStatus("loading");
    timer.current = window.setTimeout(() => {
      setStatus(value === DEMO_CODE ? "success" : "error");
    }, 900);
  };

  const message =
    status === "success" ? "Code verified. You're in."
    : status === "error" ? "That code didn't match. Check it and try again."
    : `Enter the 6-digit code we sent to •••• 4821. Demo code: ${DEMO_CODE}`;

  return (
    <div className="grid w-full max-w-3xl gap-10 py-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <OtpInput
          label="Verification code"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (status === "error" || status === "success") setStatus("idle");
          }}
          onComplete={verify}
          status={status}
          message={message}
          groupSize={3}
          name="otp"
        />
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={seconds > 0}
            onClick={() => {
              setSeconds(30);
              setCode("");
              setStatus("idle");
            }}
            className="rounded-md font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          >
            {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCode("");
              setStatus("idle");
            }}
            className="rounded-md text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <OtpInput label="4-digit PIN (masked)" length={4} mask message="Characters are hidden as you type." />
        <OtpInput
          label="Recovery key (letters and numbers)"
          length={8}
          mode="alphanumeric"
          groupSize={4}
          message="Paste a key like AB12-CD34 into any box."
        />
        <OtpInput label="Disabled" length={6} defaultValue="135" disabled message="Locked while the account is under review." />
      </div>
    </div>
  );
}
