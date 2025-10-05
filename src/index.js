import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import { exec } from 'child_process';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
const PORT=3000
const app=express();

app.use(cors());
app.use(express.static('public'));
app.use('/videos',express.static('processed'));
const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        return cb(null,'uploads/')
    },
    filename:(req,file,cb)=>{
        cb(null,`${Date.now()}-${file.originalname.replace(/\s+/g,"_")}`)
    }
})

const upload=multer({storage:storage});


app.post('/upload',upload.single('video'),(req,res)=>{
    if(!req.file){
        return res.status(400).json({message:'no file uploaded'});
    }
    const videoId=uuidv4();
    const inputPath=req.file.path;
    const outputPath=`processed/${videoId}`;
    const playlistUrl=`http://localhost:${PORT}/videos/${videoId}/index.m3u8`;

    //0->1080 1->720 2->480
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(`${outputPath}/0`, { recursive: true });
        fs.mkdirSync(`${outputPath}/1`, { recursive: true });
        fs.mkdirSync(`${outputPath}/2`, { recursive: true });
    }


    const ffmpegCommand = `
                            ffmpeg -i ${inputPath} \
                            -filter_complex "[0:v]split=3[v1][v2][v3];
                            [v1]scale=w=1920:h=1080:force_original_aspect_ratio=decrease[v1out];
                            [v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease[v2out];
                            [v3]scale=w=854:h=480:force_original_aspect_ratio=decrease[v3out]" \
                            -map [v1out] -c:v:0 libx264 -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k -map a:0 -c:a:0 aac -b:a:0 192k \
                            -map [v2out] -c:v:1 libx264 -b:v:1 3000k -maxrate:v:1 3210k -bufsize:v:1 4500k -map a:0 -c:a:1 aac -b:a:1 128k \
                            -map [v3out] -c:v:2 libx264 -b:v:2 1500k -maxrate:v:2 1600k -bufsize:v:2 2500k -map a:0 -c:a:2 aac -b:a:2 96k \
                            -f hls \
                            -hls_time 10 \
                            -hls_playlist_type vod \
                            -hls_segment_filename "${outputPath}/%v/segment%03d.ts" \
                            -master_pl_name index.m3u8 \
                            -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
                            "${outputPath}/%v/index.m3u8"
                            `;
    console.log('executing ffmpeg command')
    exec(ffmpegCommand,(error,stout,stderr)=>{
        if(error){
            console.log('exec error: ',error)
            return res.status(500).json({message:'error processing video'});
        }

        console.log('video processed successfully');

        fs.unlinkSync(inputPath);

        res.status(200).json({
            message:'video successfully processed',
            playlisturl:playlistUrl
        })

    })

});


app.get('/',(req,res)=>{
    res.send('index.html');
})

app.listen(PORT,()=>{
    console.log('running on http://localhost:',PORT);
})