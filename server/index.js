require("dotenv").config();
const express = require("express");
const connection = require("./connection");
const app = express();
const _ = require("lodash");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { Parser } = require("json2csv");
const fs = require("fs");

const csvParser = new Parser({
  delimiter: ";",
});
function jsonToCsv(items) {
  const header = Object.keys(_.maxBy(items, (i) => Object.keys(i).length));
  const headerString = header.join(';');
  // handle null or undefined values here
  const replacer = (key, value) => value ?? '';
  const rowItems = items.map((row) =>
    header
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(';')
  );
  // join header and body, and break into separate lines
  const csv = [headerString, ...rowItems].join('\r\n');
  return csv;
}

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
    let tempFinalDistinte = [];

    const filePath = path.resolve(req.file.path);

    const elements = fs.readFileSync(filePath).toString().split("\r\n");

    const arrayDBBeforePromise = elements.map(async (row, index) => {
      /*       const EKD_CODE = await GetEkdCode(row);
      
            if (EKD_CODE.recordset) { */
      const row_split = row.split(';')

      const distinta = await GetDistintaBase(row_split[0], row_split[1]);
      const materie = await GetMateriePrime(row_split[0]);

      const sll_pfl = await GetSemilavorati(row_split[0], row_split[1]);


   /*    distinta.filter(el=>{
        if(el.Elemento=="M00007444"){
          console.log(el);
        }
      }) */

   /*    console.log(distinta,
        materie,
        sll_pfl); */
      /*     distinta.filter(el=>{
            if(el.Elemento=="M00007444"){
              console.log(el);
            }
          });
     */


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

/*     arrayDistinte.filter(el=>{
    
    })
 */
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
        const codice_complessivo = (await GetCodiceCliente(row.Complessivo))
          .CodiceCliente;
        const codice_padre = (await GetCodiceCliente(row.Padre)).CodiceCliente;
        const codice_elemento = (await GetCodiceCliente(row.Elemento))
          .CodiceCliente;
        const tempRow = {
          Complessivo: row.Complessivo,
          Complessivo_cliente: codice_complessivo,
          Padre: row.Padre,
          Padre_cliente: codice_padre,
          Elemento: row.Elemento,
          Elemento_cliente: codice_elemento,
          Materia_code: row.Materia_code,
          Materia: row.Materia,
          Categoria: row.Categoria,
          Famiglia_code: row.CFGLIN_0,
          Famiglia_desc: row.desc_fam,
          Descrizione1: row.Descrizione1,
          Descrizione2: row.Descrizione2,
          Descrizione3: row.Descrizione3,
          Quantita_materia: row.Quantita_materia,
          Unita_materia: row.Unita_materia,
        };

        return defaults(tempRow, {});
      });

      const codeArrayDistintePost = await Promise.all(codeArrayDistinte);

      codeArrayDistintePost.forEach(e => {
        if (!Object.keys(e)[Object.keys(e).length - 1] == 'materiale') {
          //   console.log(e);
        }
      })


      const csv = csvParser.parse(codeArrayDistintePost);
      const csv1 = jsonToCsv(codeArrayDistintePost)
      console.log();
      const pathNewFile = fs.writeFileSync(
        path.join(__dirname, "distinte.csv"),
        csv1
      );
      //res.json(codeArrayDistintePost)
      //       console.log(csv);
      res.download(path.join(__dirname, "distinte.csv"));
    }
  }
);
async function GetMateriePrime(ITMREF) {
  const query = `	  with wth as 
  (
    select ITMREF_0,CPNITMREF_0,BOMQTY_0,BOMUOM_0, BOMALT_0 from PRODEKD.BOMD where ITMREF_0='${ITMREF}' and BOMALT_0='2' and (BOMENDDAT_0 = '1753-01-01 00:00:00.000')
    union ALL
    select D.ITMREF_0,D.CPNITMREF_0,D.BOMQTY_0,D.BOMUOM_0,D.BOMALT_0
    from wth w
    join PRODEKD.BOMD D on w.CPNITMREF_0 = D.ITMREF_0
    where D.BOMALT_0='2'  and (D.BOMENDDAT_0 = '1753-01-01 00:00:00.000' or D.BOMENDDAT_0 >GETDATE())

  )

  select   '${ITMREF}' as Complessivo, wth.ITMREF_0 as Padre, wth.CPNITMREF_0 as Elemento,ITM.SEAKEY_0 ,ITM.TCLCOD_0 as Categoria,ITM.ITMDES1_0 as Descrizione1,ITMDES2_0 as Descrizione2,ITMDES3_0 as Descrizione3,ITM.CFGLIN_0,wth.BOMQTY_0 as Quantita, wth.BOMUOM_0 as Unita 
  from wth 
    left join PRODEKD.ITMMASTER ITM on wth.CPNITMREF_0 = ITM.ITMREF_0
    left join (
      select ITMREF_0, sum(QTYSTU_0) as qty
      from PRODEKD.STOCK
      group by ITMREF_0
    ) stock on stock.ITMREF_0=wth.CPNITMREF_0 
    where BOMALT_0='2' and TCLCOD_0 not in ('PFL01','SLL01') 
    `;

  const sage = await connection.connect();
  const result = await sage.query(query);

  const lineeBP = result.recordset.map(async (row, index) => {
    /* const linee = await GetLineeProdotto(row.Elemento);
    const ciclo = await GetPrimaFase(row.Elemento); */
    const descrizione_famiglia = await GetDescrizioneFamiglia(row.CFGLIN_0)
    let tempObj = { ...row };

    let unionTemp = { ...tempObj, desc_fam: descrizione_famiglia };

    return unionTemp;
  });
  return Promise.all(lineeBP);
}
async function GetSemilavorati(ITMREF, in_production) {
  const query = `	  with wth as 
  (
    select ITMREF_0,CPNITMREF_0,BOMQTY_0,BOMUOM_0, BOMALT_0 from PRODEKD.BOMD where ITMREF_0='${ITMREF}' and BOMALT_0='2' and (BOMENDDAT_0 = '1753-01-01 00:00:00.000' or BOMENDDAT_0 >GETDATE())
    union ALL
    select D.ITMREF_0,D.CPNITMREF_0,D.BOMQTY_0,D.BOMUOM_0,D.BOMALT_0
    from wth w
    join PRODEKD.BOMD D on w.CPNITMREF_0 = D.ITMREF_0
  where D.BOMALT_0='2'  and (D.BOMENDDAT_0 = '1753-01-01 00:00:00.000' or D.BOMENDDAT_0 >GETDATE())

  )

  select   '${ITMREF}' as Complessivo, wth.ITMREF_0 as Padre, wth.CPNITMREF_0 as Elemento,ITM.SEAKEY_0 ,ITM.TCLCOD_0 as Categoria,ITM.ITMDES1_0 as Descrizione1,ITMDES2_0 as Descrizione2,ITMDES3_0 as Descrizione3,ITM.CFGLIN_0,wth.BOMQTY_0 as Quantita, wth.BOMUOM_0 as Unita 
  from wth 
    left join PRODEKD.ITMMASTER ITM on wth.CPNITMREF_0 = ITM.ITMREF_0
    left join (
      select ITMREF_0, sum(QTYSTU_0) as qty
      from PRODEKD.STOCK
      group by ITMREF_0
    ) stock on stock.ITMREF_0=wth.CPNITMREF_0 
    where BOMALT_0='2' and TCLCOD_0 in ('PFL01','SLL01','CPL01')
    `;

  const sage = await connection.connect();
  const result = await sage.query(query);
  let distinta = [...result.recordset];
  let after = [];
  _.each(distinta, (row) => {
    let tempRow = { ...row };
    const filterDistinta = _.filter(
      distinta,
      (r) => row.Padre === r.Elemento
    );
    const checkNewArray = _.filter(after, (r) => row.Complessivo === r.Elemento);
    if (checkNewArray.length > 0) {
      tempRow.Quantita = row.Quantita * checkNewArray[0].Quantita;
    } else {
      if (filterDistinta.length > 0) {
        tempRow.Quantita = row.Quantita * filterDistinta[0].Quantita * in_production;
      } else {
        tempRow.Quantita = row.Quantita * in_production;
      }
    }
    tempRow.Quantita = Number(tempRow.Quantita)
    after.push(tempRow);
  });
  const lineeBP = after.map(async (row, index) => {
    /*     const linee = await GetLineeProdotto(row.Elemento);
        const ciclo = await GetPrimaFase(row.Elemento); */

    let tempObj = { ...row };

    let unionTemp = { ...tempObj };

    return unionTemp;
  });
  return Promise.all(lineeBP);
}
//codice cliente
async function GetCodiceCliente(CodiceEkd) {
  return new Promise(async (resolve, reject) => {
    const db = await connection.connect();
    const { recordset } = await db
      .request()
      .input("codice", CodiceEkd)
      .query(
        `IF (select  COUNT(SEAKEY_0) from PRODEKD.ITMMASTER where ITMREF_0=@codice)>0 
            select  SEAKEY_0 from PRODEKD.ITMMASTER where ITMREF_0=@codice
               ELSE 
            select ITMREFBPC_0 as 'SEAKEY_0' from PRODEKD.ITMBPC where ITMREF_0 =@codice`
      );

    if (recordset.length > 0) {
      resolve({
        CodiceEkd,
        CodiceCliente: recordset[0].SEAKEY_0,
      });
    } else {
      resolve({
        CodiceEkd,
        CodiceCliente: undefined,
      });
    }
  });
}

function GetEkdCode(CodiceCliente) {
  return new Promise(async (resolve, reject) => {
    const db = await connection.connect();
    const { recordset } = await db
      .request()
      .input("codice", CodiceCliente.toString())
      .query(
        `IF (select COUNT(ITMREF_0) from PRODEKD.ITMBPC where ITMREFBPC_0 = @codice)>0 
                            select ITMREF_0,ITMREFBPC_0 from PRODEKD.ITMBPC where ITMREFBPC_0 =@codice
                            ELSE 
                            select ITMREF_0, SEAKEY_0 from PRODEKD.ITMMASTER where SEAKEY_0=@codice`
      );

    resolve({
      CodiceCliente,
      recordset: recordset[0],
    });
    /*  if (recordset.length == 0) {
       fileText += `${e},inesistente\r\n`;
     } else {
       fileText += `${e},${recordset[0].ITMREF_0}\r\n`;
     }
*/
  });
}
//GetDistintaBase("M00003550");
async function GetPrimaFase(ITMREF) {
  const query = `	  SELECT  TEXTE_0 
  FROM PRODEKD.ROUOPE 
  left join PRODEKD.ATEXTRA ATEXTRA ON ATEXTRA.IDENT1_0 = WST_0 AND CODFIC_0='WORKSTATIO' and LANGUE_0='ITA' and ZONE_0='WSTDESAXX' and IDENT2_0='ITS02'
  WHERE ITMREF_0='${ITMREF}' 
  ORDER BY ITMREF_0, OPENUM_0`;

  const sage = await connection.connect();
  const result = await sage.query(query);

  if (result.recordset.length > 0) {
    return result.recordset[0].TEXTE_0;
  } else {
    return "null";
  }
}

async function GetDistintaBase(ITMREF, in_production) {
  const query = `with wth as 
    (
      select ITMREF_0,CPNITMREF_0,BOMQTY_0,BOMUOM_0, BOMALT_0 from PRODEKD.BOMD where ITMREF_0='${ITMREF}' and (BOMENDDAT_0 = '1753-01-01 00:00:00.000' or BOMENDDAT_0 >GETDATE())
      union ALL
      select D.ITMREF_0,D.CPNITMREF_0,D.BOMQTY_0,D.BOMUOM_0,D.BOMALT_0
      from wth w
      join PRODEKD.BOMD D on w.CPNITMREF_0 = D.ITMREF_0
    )
  
    select   '${ITMREF}' as Complessivo, wth.ITMREF_0 as Padre, wth.CPNITMREF_0 as Elemento,ITM.SEAKEY_0 ,ITM.TCLCOD_0 as Categoria,ITM.ITMDES1_0 as Descrizione1,ITMDES2_0 as Descrizione2,ITMDES3_0 as Descrizione3,ITM.CFGLIN_0,wth.BOMQTY_0 as Quantita, wth.BOMUOM_0 as Unita 
    from wth 
      left join PRODEKD.ITMMASTER ITM on wth.CPNITMREF_0 = ITM.ITMREF_0
      left join (
        select ITMREF_0, sum(QTYSTU_0) as qty
        from PRODEKD.STOCK
        group by ITMREF_0
      ) stock on stock.ITMREF_0=wth.CPNITMREF_0 
      where BOMALT_0='2' and wth.CPNITMREF_0 not like 'SER%'
      `;

  const sage = await connection.connect();
  const result = await sage.query(query);
  let distinta = [...result.recordset];
  let after = [];
  _.each(distinta, (row) => {
    let tempRow = { ...row };
    const filterDistinta = _.filter(
      distinta,
      (r) => row.Complessivo === r.Elemento
    );
    const checkNewArray = _.filter(after, (r) => row.Complessivo === r.Elemento);
    if (checkNewArray.length > 0) {
      tempRow.Quantita = row.Quantita * checkNewArray[0].Quantita;
    } else {
      if (filterDistinta.length > 0) {
        tempRow.Quantita = row.Quantita * filterDistinta[0].Quantita * in_production;
      } else {
        tempRow.Quantita = row.Quantita * in_production;
      }
    }
    tempRow.Quantita = Number(tempRow.Quantita)
    after.push(tempRow);
  });
  const lineeBP = after.map(async (row, index) => {

    let tempObj = { ...row };
    let unionTemp = { ...tempObj };

    return unionTemp;
  });
  return Promise.all(lineeBP);
}

function customizer(objValue, srcValue) {
  return _.isUndefined(objValue) ? srcValue : objValue;
}
var defaults = _.partialRight(_.assignWith, customizer);

async function GetLineeProdotto(elemento) {
  return new Promise(async (resolve, reject) => {
    const sage = await connection.connect();
    /*      
       const labels = await sage.query(`select  from PRODEKD.APLSTD where LANCHP_0=760 and LAN_0='ITA'`)        
       const getConfig = await sage.query(`select CFGNUM1_0,CFGNUM2_0,CFGNUM3_0,CFGNUM4_0,CFGNUM5_0,CFGNUM6_0 
       from PRODEKD.ITMMASTER ITM
       left join PRODEKD.TABLINCFG CFG on CFG.CFGLIN_0=ITM.CFGLIN_0
       where ITM.ITMREF_0='${elemento}'
       `)
       const value = await sage.query(`select CFGFLDNUM1_0,CFGFLDNUM2_0,CFGFLDNUM3_0,CFGFLDNUM4_0,CFGFLDNUM5_0,CFGFLDNUM6_0  from PRODEKD.ITMMASTER where ITMREF_0='${elemento}'`)
 */
    /**------------------------------------------------------------------------------- */
    var temp = {};
    /*  temp["STATISTICO 1"] = await GetStatistico1(elemento);
     temp["STATISTICO 2"] = await GetStatistico2(elemento); */
    const lp = await sage.query(`
       select CFGNUM1_0,CFGNUM2_0,CFGNUM3_0,CFGNUM4_0,CFGNUM5_0,CFGNUM6_0 from  PRODEKD.TABLINCFG WHERE CFGLIN_0=(
         select CFGLIN_0  from PRODEKD.ITMMASTER where ITMREF_0='${elemento}'
       )
       `);

    const values = await sage.query(
      `select CFGFLDNUM1_0,CFGFLDNUM2_0,CFGFLDNUM3_0,CFGFLDNUM4_0,CFGFLDNUM5_0,CFGFLDNUM6_0  from PRODEKD.ITMMASTER where ITMREF_0='${elemento}'`
    );

    const label = await sage.query(`
       select * from PRODEKD.APLSTD where LANCHP_0=760 and LAN_0='ITA' 
       `);
    const lab = await sage.query(
      `select LANMES_0 from PRODEKD.APLSTD where LANCHP_0=760 and LAN_0='ITA'`
    );
    var model = {};
    /*    
    lab.recordset.forEach((la) => {
      model[la.LANMES_0] = 0;
    });
    if (lp.recordset.length > 0) {
   const label_key = Object.keys(lp.recordset[0]);
      const lb_ = await sage.query(
        `select * from PRODEKD.APLSTD where LANCHP_0=760 and LAN_0='ITA'`
      );
      const lb = lb_.recordset;
      label_key.forEach(async (key, index) => {
        temp[
          lb.filter((lbk) => {
            return lbk.LANNUM_0 == lp.recordset[0][key];
          })[0].LANMES_0
        ] = Number(values.recordset[0][Object.keys(values.recordset[0])[index]]).toLocaleString();
      });

      const te = defaults(temp, model);
      return resolve(te); 
    } else {
    }
    */
    resolve(defaults(temp, model));
  });
}
async function GetStatistico1(elemento) {
  const sage = await connection.connect();

  const statistico = await sage.query(`    
    select TEXTE_0 from PRODEKD.ATEXTRA
    where LANGUE_0='ITA' and IDENT1_0='20' and ZONE_0='LNGDES' and IDENT2_0 = (
    select TSICOD_0 from PRODEKD.ITMMASTER where ITMREF_0='${elemento}') and IDENT2_0<>''
    `);
  if (statistico.recordset.length > 0) {
    return statistico.recordset[0].TEXTE_0;
  } else {
    return "";
  }
  return statistico.recordset;
}
async function GetStatistico2(elemento) {
  const sage = await connection.connect();

  const statistico = await sage.query(`    
    select TEXTE_0 from PRODEKD.ATEXTRA
    where LANGUE_0='ITA' and IDENT1_0='21' and ZONE_0='LNGDES' and IDENT2_0 = (
    select TSICOD_1 from PRODEKD.ITMMASTER where ITMREF_0='${elemento}') and IDENT2_0<>''
    `);
  if (statistico.recordset.length > 0) {
    return statistico.recordset[0].TEXTE_0;
  } else {
    return "";
  }
  return statistico.recordset;
}
async function GetDescrizioneFamiglia(CFGLIN) {
  const sage = await connection.connect();

  const statistico = await sage.query(` select * from PRODEKD.ATEXTRA 
        where CODFIC_0 = 'TABLINCFG' 
        and ZONE_0='CFGLINAXX'
        and IDENT1_0='${CFGLIN}'
    `);
  if (statistico.recordset.length > 0) {
    return statistico.recordset[0].TEXTE_0;
  } else {
    return "";
  }
  return statistico.recordset;
}

app.listen(5004, () => {
  console.log('modifica');
  console.log("http://localhost:5004");
});
