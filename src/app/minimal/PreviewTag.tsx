import { isPreviewHost } from "./preview-host";

declare const __BUILD_REF__: string;

export function PreviewTag({ hostname = window.location.hostname }: { hostname?: string }) {
  if (!isPreviewHost(hostname)) return null;
  return <div className="mini-preview-tag" role="note">V0 minimal · {typeof __BUILD_REF__ === "string" ? __BUILD_REF__ : "local"}</div>;
}
