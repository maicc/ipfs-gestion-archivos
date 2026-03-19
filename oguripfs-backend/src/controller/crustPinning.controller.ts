import { Request, Response } from 'express';
import { getOrderState, confirmarSubida } from '../services/crustPinning.service.js';
import { FileDataPayload } from '../types/index.js';

export const confirmarSubidaController = async (req: Request, res: Response) => {
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));
    /* 
    const {
        keyR2,
        respuestaKubo: {
            name,
            cid,
            size
        }
    } = req.body;

    if (!keyR2 || !respuestaKubo?.cid || !name || !size) {
        return res.status(400).json({ error: "Faltaron datos de Go" });
    }

    const fileInfoSanitizado: FileDataPayload = {
       keyR2,
        respuestaKubo: {
            name,
            cid,
            size
        }
    }
        
*/

const { keyR2, respuestaKubo } = req.body;

if (!keyR2 || !respuestaKubo?.hash || !respuestaKubo?.name || !respuestaKubo?.size) {
    return res.status(400).json({ error: "Faltaron datos de Go" });
}
const fileInfoSanitizado: FileDataPayload = {
    keyR2,
    respuestaKubo: {
        name: respuestaKubo.name,
        hash: respuestaKubo.hash,
        size: respuestaKubo.size
    }
};


    console.log(`Recibido desde go -> Video UUID: ${respuestaKubo.name} | CID: ${respuestaKubo.hash} | SIZE: ${respuestaKubo.size}`)

    const respuesta = await confirmarSubida(fileInfoSanitizado)

    return res.status(200).json(respuesta);

}

//Función para hacer una consulta en la blockchain acerca de el estado de nuestro archivo
export const getOrderStateController = async (req: Request, res: Response) => {
    const { cid } = req.body

    if (!cid) {
        return res.status(400).json({ message: "Falto agregar el cid en la consulta" });
    }

    const resultado = await getOrderState(cid);

    return res.status(200).json(resultado)

}