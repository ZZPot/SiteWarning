

var frameId = "warning-frame"
if (!document.getElementById(frameId))
{

    const frame = document.createElement('div');
    const alert = document.createElement('marquee');
    const warning = document.createElement("span");
    warning.textContent = "ВНИМАНИЕ!"
    frame.id = frameId;
    alert.appendChild(warning)

    document.documentElement.appendChild(frame)
    document.documentElement.appendChild(alert)
    
}
undefined;