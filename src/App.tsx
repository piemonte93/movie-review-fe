import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import axios, { AxiosResponse, AxiosError } from "axios";

function App() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    axios
      .get<string>("/test")
      .then((res: AxiosResponse<string>) => {
        setMessage(res.data);
      })
      .catch((error: AxiosError) => {
        console.error("API 요청 실패:", error);
        console.log(error.response?.data);
        setMessage("데이터를 불러오는 데 실패했습니다.");
      });
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <p>{message}</p>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
