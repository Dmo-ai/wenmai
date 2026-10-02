"use client";

import {Maximize2, Minus, Plus, RotateCw} from "lucide-react";
import {useRef, useState} from "react";

type ViewMode = "front" | "back" | "3d";

export default function ProductViewer({compact=false, plan=0}:{compact?:boolean;plan?:number}) {
  const [mode,setMode]=useState<ViewMode>("front");
  const [zoom,setZoom]=useState(1);
  const [rotation,setRotation]=useState({x:-8,y:-24});
  const drag=useRef<{x:number;y:number;rx:number;ry:number}|null>(null);
  const front="/wenmai/wenmai-box-front.jpg";
  const back="/wenmai/wenmai-box-back.jpg";
  const three="/wenmai/wenmai-box-3d.jpg";
  const palettes=["plan-a","plan-b","plan-c"];

  function start(e:React.PointerEvent){
    if(mode!=="3d")return;
    drag.current={x:e.clientX,y:e.clientY,rx:rotation.x,ry:rotation.y};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e:React.PointerEvent){
    if(!drag.current||mode!=="3d")return;
    setRotation({x:Math.max(-35,Math.min(35,drag.current.rx-(e.clientY-drag.current.y)*.25)),y:drag.current.ry+(e.clientX-drag.current.x)*.38});
  }
  function end(){drag.current=null}
  function reset(){setRotation({x:-8,y:-24});setZoom(1)}

  return <div className={`product-viewer ${compact?"compact-viewer":""} ${palettes[plan]}`}>
    <div className="viewer-head">
      <div className="view-tabs" role="tablist" aria-label="包装视图">
        <button role="tab" aria-selected={mode==="front"} className={mode==="front"?"active":""} onClick={()=>setMode("front")}>正面</button>
        <button role="tab" aria-selected={mode==="back"} className={mode==="back"?"active":""} onClick={()=>setMode("back")}>背面</button>
        <button role="tab" aria-selected={mode==="3d"} className={mode==="3d"?"active":""} onClick={()=>setMode("3d")}><RotateCw/>360° 立体</button>
      </div>
      <div className="zoom-tools" aria-label="预览缩放工具">
        <button aria-label="缩小" onClick={()=>setZoom(z=>Math.max(.65,z-.12))}><Minus/></button>
        <span>{Math.round(zoom*100)}%</span>
        <button aria-label="放大" onClick={()=>setZoom(z=>Math.min(1.65,z+.12))}><Plus/></button>
        <button aria-label="重置视图" onClick={reset}><Maximize2/></button>
      </div>
    </div>
    <div className={`viewer-stage mode-${mode}`} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onWheel={e=>{e.preventDefault();setZoom(z=>Math.max(.65,Math.min(1.65,z+(e.deltaY<0?.08:-.08))))}}>
      {mode!=="3d"&&<img className="flat-view" style={{transform:`scale(${zoom})`}} src={mode==="front"?front:back} alt={mode==="front"?"茶叶礼盒正面完整视图":"茶叶礼盒背面完整视图"}/>} 
      {mode==="3d"&&<>
        <img className="viewer-3d-reference" src={three} alt="茶叶礼盒三维参考图"/>
        <div className="scene-3d" aria-label="可拖动旋转的茶叶礼盒三维模型">
          <div className="box-3d" style={{transform:`scale(${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`}}>
            <div className="box-face box-front" style={{backgroundImage:`url(${front})`}}/>
            <div className="box-face box-back" style={{backgroundImage:`url(${back})`}}/>
            <div className="box-face box-left"/><div className="box-face box-right"/>
            <div className="box-face box-top"/><div className="box-face box-bottom"/>
          </div>
        </div>
        <span className="drag-instruction"><RotateCw/>按住拖动旋转 · 滚轮缩放</span>
      </>}
    </div>
  </div>
}

