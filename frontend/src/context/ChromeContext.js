import { createContext } from "react";

// Provides per-card chrome actions (delete/collapse/resize) to CardShell,
// so individual card components don't need to thread these props.
const ChromeContext = createContext(null);
export default ChromeContext;
