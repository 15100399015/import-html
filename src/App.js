import DocumentLoader from './DocumentLoader'
import './App.css';
import { useCallback, useEffect, useState } from 'react';

function App() {

  const [tpl, setTpl] = useState()

  const fetchMainData = useCallback(async () => {
    const tpl = await fetch('/test.html').then((res) => res.text())
    setTpl(tpl)
  }, [])

  useEffect(() => {
    if (!tpl) {
      fetchMainData()
    }
  }, [fetchMainData, tpl])
  return (
    <div className="App" style={{
      width: 500,
      height: 500,
      overflow: "auto"
    }}>
      <DocumentLoader code={tpl}></DocumentLoader>
    </div>
  );
}

export default App;
