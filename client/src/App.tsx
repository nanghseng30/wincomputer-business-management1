import ErrorBoundary from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/lib/ui";
import Workspace from "@/pages/Workspace";

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Workspace />
      </LanguageProvider>
    </ErrorBoundary>
  );
}
