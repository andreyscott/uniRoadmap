/**
 * Runs synchronously in <head> before first paint, so there is no light-to-dark flash.
 * Uses the saved choice from localStorage, otherwise follows the OS setting (and keeps
 * following it live until the user picks a theme with the toggle).
 */
const script = `(function(){try{
var root=document.documentElement,mq=matchMedia("(prefers-color-scheme: dark)");
function apply(dark){root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}
var saved=localStorage.getItem("theme");
apply(saved?saved==="dark":mq.matches);
mq.addEventListener("change",function(e){if(!localStorage.getItem("theme"))apply(e.matches);});
}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
