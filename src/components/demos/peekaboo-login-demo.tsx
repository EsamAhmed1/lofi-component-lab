"use client";

import { PeekabooLogin, type PeekabooLoginValues } from "@/components/ui/peekaboo-login";

const DEMO_EMAIL = "demo@lofi.dev";
const DEMO_PASSWORD = "lofi1234";

// Fake auth: only the demo account gets in, after a short network-like delay.
function fakeSignIn({ email, password }: PeekabooLoginValues) {
  return new Promise<void>((resolve, reject) => {
    window.setTimeout(() => {
      if (email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) resolve();
      else reject(new Error("That email and password don't match an account. Try the demo login above."));
    }, 900);
  });
}

export default function PeekabooLoginDemo() {
  return (
    <div className="@container w-full py-6">
      <div className="mx-auto grid w-full max-w-3xl justify-items-center gap-8 @3xl:grid-cols-2 @3xl:items-start">
        <PeekabooLogin
          onSubmit={fakeSignIn}
          title="Welcome back"
          subtitle="Sign in to your Lofi workspace."
          hint={
            <>
              Demo login: <span className="font-mono text-foreground">{DEMO_EMAIL}</span> /{" "}
              <span className="font-mono text-foreground">{DEMO_PASSWORD}</span>
            </>
          }
          signUpHref="#sign-up"
          forgotHref="#forgot"
        />
        <PeekabooLogin
          onSubmit={fakeSignIn}
          mascotColor="#14b8a6"
          title="Team portal"
          subtitle="Sign-in is paused during scheduled maintenance until 14:00 UTC."
          minPasswordLength={10}
          labels={{ submit: "Sign-in paused", email: "Work email" }}
          disabled
        />
      </div>
    </div>
  );
}
