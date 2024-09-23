require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  GetCodiceCliente,
  GetDistintaBase,
  GetMateriePrime,
  GetSemilavorati,
  jsonToCsv,
  defaults,
  csvParser
} = require('./utils')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(cors());

app.get("/distinta_base/single", (req, res) => {
  res.send("distinta base sigole");
});

app.post(
  "/distinta_base/multiple",
  upload.single("elementi"),
  async (req, res) => {
    const filePath = path.resolve(req.file.path);
    const elements = fs.readFileSync(filePath).toString().split("\r\n");

    const arrayDBBeforePromise = elements.map(async (row, index) => {

      const row_split = row.split(';')

      const distinta = await GetDistintaBase(row_split[0], row_split[1]);
      const materie = await GetMateriePrime(row_split[0]);

      const sll_pfl = await GetSemilavorati(row_split[0], row_split[1]);

      if (sll_pfl.length == 0 && materie.length > 0) {
        const dis_mat = distinta.map(dis => {
       
          const mat_sll = materie.filter((materiale) => {
            return materiale.Padre == dis.Elemento;
          });
          if (mat_sll.length > 0) {
            let tempObj = {
              Complessivo: dis.Complessivo,
              Padre: dis.Padre,
              Elemento: dis.Elemento,
              Materia: mat_sll[0].Elemento,
              Materia_code: mat_sll[0].SEAKEY_0,
              Quantita_materia: (Number(mat_sll[0].Quantita) * Number(dis.Quantita)).toLocaleString(),
              Unita_materia: mat_sll[0].Unita,
              Descrizione1: mat_sll[0].Descrizione1,
              Descrizione2: mat_sll[0].Descrizione2,
              Descrizione3: mat_sll[0].Descrizione3,
              CFGLIN_0: mat_sll[0].CFGLIN_0,
              Quantita: dis.Quantita,
              Unita: dis.Unita,
              fase: dis.fase,
            };

            return defaults(tempObj, mat_sll[0]);

          } else {

            let tempObj = {
              Complessivo: dis.Complessivo,
              Padre: dis.Padre,
              Elemento: dis.Elemento,
              Materia: dis.Elemento,
              Materia_code: dis.SEAKEY_0,
              Quantita_materia: Number(dis.Quantita).toLocaleString(),
              Unita_materia: dis.Unita,
              Descrizione1: dis.Descrizione1,
              Descrizione2: dis.Descrizione2,
              Descrizione3: dis.Descrizione3,
              CFGLIN_0: dis.CFGLIN_0,
              Quantita: 1,
              Unita: 'PZ',
              fase: dis.fase,
            };
            
            return defaults(tempObj, dis);
          }
        })
        return dis_mat;
      } else {
        const sll_pfl_mat = sll_pfl.map((sll) => {
          const mat_sll = materie.filter((materiale) => {
            return materiale.Padre == sll.Elemento;
          });

          if (mat_sll.length > 0) {
            let tempObj = {
              Complessivo: sll.Complessivo,
              Padre: sll.Padre,
              Elemento: sll.Elemento,
              Materia: mat_sll[0].Elemento,
              Materia_code: mat_sll[0].SEAKEY_0,
              Quantita_materia: (Number(mat_sll[0].Quantita) * Number(sll.Quantita)).toLocaleString(),
              Unita_materia: mat_sll[0].Unita,
              Descrizione1: mat_sll[0].Descrizione1,
              Descrizione2: mat_sll[0].Descrizione2,
              Descrizione3: mat_sll[0].Descrizione3,
              CFGLIN_0: mat_sll[0].CFGLIN_0,
              Quantita: sll.Quantita,
              Unita: sll.Unita,
              fase: sll.fase,
            };
            return defaults(tempObj, mat_sll[0]);
          } else {
            return sll;
          }
        });
        return sll_pfl_mat;
      }
      /*  } else {
         return EKD_CODE;
       } */
    });

    const arrayDistinte = [...(await Promise.all(arrayDBBeforePromise))];


    const undefined_number = arrayDistinte.filter((row) => {
      return row.recordset;
    });

    if (undefined_number.length > 0) {
      const undefined_pn = undefined_number.map((row) => {
        return row.CodiceCliente;
      });

      const pathNewFile = fs.writeFileSync(
        path.join(__dirname, "distinte.csv"),
        undefined_pn.join(",").toString()
      );
      res.download(path.join(__dirname, "distinte.csv"));
    } else {
      let aconcat = [];

      arrayDistinte.forEach((row) => {
        aconcat = aconcat.concat(row);
      });

      const codeArrayDistinte = aconcat.map(async (row) => {

        const codice_complessivo = (await GetCodiceCliente(row.Complessivo)).CodiceCliente;
        const codice_padre = (await GetCodiceCliente(row.Padre)).CodiceCliente;
        const codice_elemento = (await GetCodiceCliente(row.Elemento)).CodiceCliente;



        const tempRow = {
          Complessivo: row.Complessivo,
          Complessivo_cliente: codice_complessivo,
          Padre: row.Padre,
          Padre_cliente: codice_padre,
          Elemento: row.Elemento,
          Elemento_cliente: codice_elemento,
          Materia: row.Materia,
          Materia_code: row.Materia_code,
          Quantita_materia: row.Quantita_materia,
          Unita_materia: row.Unita_materia,
          Descrizione1: row.Descrizione1,
          Descrizione2: row.Descrizione2,
          Descrizione3: row.Descrizione3,
        };

        return defaults(tempRow, row);
      });

      const codeArrayDistintePost = await Promise.all(codeArrayDistinte);

      codeArrayDistintePost.forEach(e => {
        if (!Object.keys(e)[Object.keys(e).length - 1] == 'materiale') {
          //   console.log(e);
        }
      })


      const csv = csvParser.parse(codeArrayDistintePost);
      const csv1 = jsonToCsv(codeArrayDistintePost)

      const pathNewFile = fs.writeFileSync(
        path.join(__dirname, "distinte.csv"),
        csv1
      );

      res.download(path.join(__dirname, "distinte.csv"));
    }
  }
);

app.listen(5004, () => {
  console.log('modifica');
  console.log("http://localhost:5004");
});
