import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

interface Props {
  onScan: (value: string) => void
  label?: string
}

// Camera only starts after the user taps the scan button (required on iOS Safari).
export function Scanner({ onScan, label = 'Start Scan' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, [])

  const start = async () => {
    if (!videoRef.current) return
    setError(null)
    // Show the video before starting so the browser can render the camera stream into it.
    setActive(true)
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    try {
      scannerRef.current?.destroy()
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          scanner.stop()
          setActive(false)
          onScan(result.data.trim())
        },
        { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
      )
      scannerRef.current = scanner
      await scanner.start()
    } catch (e) {
      setActive(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const stop = () => {
    scannerRef.current?.stop()
    setActive(false)
  }

  return (
    <div className="scanner">
      <video ref={videoRef} className={active ? 'sketch' : 'sketch hidden'} playsInline muted />
      {active ? (
        <button className="btn" onClick={stop}>Cancel</button>
      ) : (
        <button className="btn primary" onClick={start}>{label}</button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
