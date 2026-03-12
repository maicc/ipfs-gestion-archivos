import multer from 'multer'

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./temp");
    },
    filename: function (req, file, cb) {
        const name = cb(null, Date.now() + "file" + file.originalname);    }
})

const upload = multer({
    storage: storage
})

export const uploadSingle = upload.single('file')
export const uploadMultiple = upload.array('files', 10);

export default upload;