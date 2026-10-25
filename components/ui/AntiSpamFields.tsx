"use client";

import { useEffect, useRef } from "react";

/** Hidden anti-spam fields: a honeypot and the time the form became interactive. */
export function AntiSpamFields() {
  const started = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (started.current) started.current.value = String(Date.now());
  }, []);
  return (
    <>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={started} type="hidden" name="startedAt" defaultValue="" />
    </>
  );
}
