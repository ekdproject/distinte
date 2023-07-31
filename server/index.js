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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
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
    const elements = fs
      .readFileSync(path.resolve(req.file.path))
      .toString()
      .split("\r\n");

    const arrayDBBeforePromise = elements.map(async (row, index) => {
      const distinta = await GetDistintaBase(row);
      return distinta;
    });

    const arrayDistinte = [...(await Promise.all(arrayDBBeforePromise))];
    let aconcat = [];
    arrayDistinte.forEach((row) => {
      aconcat = aconcat.concat(row);
    });

    const csv = csvParser.parse(aconcat);
    const pathNewFile = fs.writeFileSync(path.join(__dirname,'distinte.csv'),csv)
    
    res.download(path.join(__dirname,'distinte.csv'))

}
);

//GetDistintaBase("M00003550");

async function GetDistintaBase(ITMREF, in_production) {
  const query = `with wth as 
    (
      select ITMREF_0,CPNITMREF_0,BOMQTY_0,BOMUOM_0, BOMALT_0 from PRODEKD.BOMD where ITMREF_0='${ITMREF}' 
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
      where BOMALT_0='1'
      `;
      console.log(query);
  const sage = await connection.connect();
  const result = await sage.query(query);

  const lineeBP = result.recordset.map(async (row, index) => {
    const linee = await GetLineeProdotto(row.Elemento);

    let tempObj = { ...row };

    let unionTemp = { ...tempObj, ...linee };

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
    temp["STATISTICO 1"] = await GetStatistico1(elemento);
    temp["STATISTICO 2"] = await GetStatistico2(elemento);
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
        ] = values.recordset[0][Object.keys(values.recordset[0])[index]];
      });

      const te = defaults(temp, model);
      return resolve(te);
    } else {
      resolve(defaults(temp, model));
    }
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

app.listen(5004, () => {
  console.log("http://localhost:5004");
});
