import "./App.css";
import { useCallback, useEffect, useState } from "react";
import { DocumentLoader } from "./WebComponents/DocumentLoader";
function App() {
  const [tpl, setTpl] = useState();

  const fetchMainData = useCallback(async () => {
    const tpl = await fetch("/test.html").then((res) => res.text());
    setTpl(tpl);
  }, []);

  useEffect(() => {
    if (!tpl) {
      fetchMainData();
    }
  }, [fetchMainData, tpl]);
  return (
    <div className="App">
      <DocumentLoader code={tpl}></DocumentLoader>
    </div>
  );
}

export default App;
