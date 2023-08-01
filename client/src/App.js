import React, { useEffect, useState } from "react";
import axios from "axios";
import { TextField, Button } from "@mui/material";

import "./App.css";
function App() {
  const [file, setFile] = useState(null);
  useEffect(() => {}, []);
  const fd = new FormData()
  return (
    <div className="App">
      <label htmlFor="elementi" />
      <TextField
        type="file"
        onChange={(e) => {
          setFile(e.currentTarget.files[0]);
        }}
        id="elementi"
        name="elementi"
      />
      <Button
        onClick={(e) => {
            if(!file){
              alert('inserire un file')
              return 
            }
            fd.append('elementi', file)
            axios.post('http://192.168.2.212:5004/distinta_base/multiple', fd).then(res => {
              const url = URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement("a");
              link.href = url;
              link.id = "hidden-link";
              link.setAttribute("download", 'distinte.csv');
              document.body.appendChild(link);
              link.click()
              document.body.removeChild(link)
            })
      
    
        }}
      >
        Invia
      </Button>
    </div>
  );
}

export default App;
