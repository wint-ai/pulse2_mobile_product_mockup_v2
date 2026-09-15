/**
 * Piping topology — v2.
 * Design source: Figma 198453:40480, six symbols:
 *   Water Line With Valve   198453:40479   Water Line No Valve   198453:40481
 *   Open Loop With Valves   198453:40511   Open Loop No Valve    198453:40586
 *   Closed Loop With Valves 198453:40749   Closed Loop No Valve  198453:40849
 *
 * Every offset below is the ml-/mt- value Figma emits, not an approximation,
 * and the pipe runs are the exported vectors rather than hand-drawn paths.
 * Closed loop is open loop without the junction glyph — that is the whole
 * difference between them in the design.
 *
 * The tile is a fixed 177x112 canvas. On a 375px phone that fits inside a card
 * with room to spare, so it scales via the `scale` prop rather than reflowing:
 * a schematic that rewraps is no longer the same schematic.
 */

import ValveStatus from './ValveStatus'

const WaterLinePipe = (props) => (
  <svg viewBox="0 0 116.893 1.40001" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><path d="M0 0.700007H116.893" stroke="#62748E" strokeWidth="1.40001"/></svg>
)

const OpenLoopPipe = (props) => (
  <svg viewBox="0 0 83.994 48.7108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><path d="M0 0.5H59.6385C72.8135 0.5 83.494 11.1804 83.494 24.3554C83.494 37.5304 72.8135 48.2108 59.6386 48.2108H0" stroke="#45556C"/></svg>
)

const ClosedLoopPipe = (props) => (
  <svg viewBox="0 0 83.994 48.7108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><path d="M0 0.5H59.6385C72.8135 0.5 83.494 11.1804 83.494 24.3554C83.494 37.5304 72.8135 48.2108 59.6386 48.2108H0" stroke="#45556C"/></svg>
)

const SensorA = (props) => (
  <svg viewBox="0 0 15.3039 13.9123" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><g> <circle cx="7.65195" cy="11.1309" r="2.08737" stroke="#62748E" strokeWidth="1.3881"/> <path d="M7.65195 9.04353V5.56458" stroke="#62748E" strokeWidth="1.3881" strokeLinecap="round"/> <path d="M14.6099 7.65195C14.6099 3.80921 11.4947 0.694051 7.65195 0.694051C3.80921 0.694051 0.694051 3.80921 0.694051 7.65195" stroke="#62748E" strokeWidth="1.3881" strokeLinecap="round"/> </g></svg>
)

const SensorB = (props) => (
  <svg viewBox="0 0 10.9398 9.94578" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><g> <circle cx="5.46988" cy="7.95482" r="1.49096" stroke="#45556C"/> <path d="M5.46988 6.46386V3.97892" stroke="#45556C" strokeLinecap="round"/> <path d="M10.4398 5.46988C10.4398 2.72509 8.21467 0.5 5.46988 0.5C2.72509 0.5 0.5 2.72509 0.5 5.46988" stroke="#45556C" strokeLinecap="round"/> </g></svg>
)

const ChevronRight = (props) => (
  <svg viewBox="0 0 11.9277 11.9277" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><g> <path d="M4.47289 2.98193L7.45482 5.96386L4.47289 8.94578" stroke="#45556C" strokeLinecap="round" strokeLinejoin="round"/> </g></svg>
)

const ChevronLeft = (props) => (
  <svg viewBox="0 0 11.9277 11.9277" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><g> <path d="M7.45482 2.98193L4.47289 5.96386L7.45482 8.94578" stroke="#45556C" strokeLinecap="round" strokeLinejoin="round"/> </g></svg>
)

const Junction = (props) => (
  <svg viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}><g> <rect width="20" height="14" fill="#F2F6FF"/> <path d="M14.3627 6.1815H12.6991C12.0334 4.91051 10.7794 4.1089 9.35596 4.01621V1.81793H11.8103C11.9629 1.81793 12.0833 1.69828 12.0833 1.54487C12.0833 1.39223 11.9637 1.27181 11.8103 1.27181H6.3564C6.20378 1.27181 6.08336 1.39147 6.08336 1.54487C6.08336 1.69751 6.20301 1.81793 6.3564 1.81793H8.81071V4.01621C7.38721 4.10903 6.13237 4.91058 5.46755 6.1815H1.27304C1.12041 6.1815 1 6.30116 1 6.45456V9.72753C1 9.88017 1.11965 10.0006 1.27304 10.0006H5.46676C6.17545 11.3537 7.54448 12.182 9.08304 12.182C10.6208 12.182 11.9899 11.3528 12.6993 10.0006H14.3629C14.8154 10.0006 15.1813 10.3657 15.1813 10.819V12.4551C15.1813 12.6078 15.3009 12.7282 15.4543 12.7282H18.727C18.8796 12.7282 19 12.6085 19 12.4551V10.819C19 8.26102 16.9223 6.18311 14.3645 6.18311L14.3627 6.1815ZM18.4529 12.1814H15.7255V10.8176C15.7255 10.0651 15.115 9.45377 14.3618 9.45377H12.5296C12.426 9.45377 12.3279 9.51359 12.2841 9.61178C11.6951 10.8605 10.4679 11.6353 9.08273 11.6353C7.69757 11.6353 6.47036 10.8606 5.88133 9.61178C5.83761 9.51896 5.73944 9.45377 5.6359 9.45377H1.54564V6.72609H5.6359C5.73944 6.72609 5.8376 6.66626 5.88133 6.56808C6.47036 5.31933 7.69752 4.54457 9.07723 4.54457C10.457 4.54457 11.6841 5.31928 12.2731 6.56808C12.3169 6.6609 12.415 6.72609 12.5186 6.72609H14.3509C16.6088 6.72609 18.4411 8.55855 18.4411 10.8167V12.1805L18.4529 12.1814Z" fill="#45556C" stroke="#45556C" strokeWidth="0.4"/> </g></svg>
)

// Absolutely-placed child. Figma lays these out as a single-cell grid with
// ml/mt offsets; a relative box with left/top is the same geometry.
function At({ left, top, w, h, children }) {
  return (
    <div style={{ position: 'absolute', left, top, width: w, height: h }}>{children}</div>
  )
}

const LABEL = {
  position: 'absolute',
  fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
  fontWeight: 400,
  color: 'var(--slate-600, #45556c)',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

function WaterLine({ valve }) {
  return (
    <>
      {/* h-0 in the comp with the rule drawn by a -0.7px inset overlay, i.e. a
          1.4px tall run spanning 116.893px. */}
      <At left={9.5} top={43.12} w={116.893} h={1.4}>
        <WaterLinePipe width="100%" height="100%" preserveAspectRatio="none" />
      </At>
      <At left={77.2} top={30.16} w={22.771} h={22.771}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ValveStatus state={valve} size={16.57} />
        </div>
      </At>
      <At left={34.7} top={32.24} w={18.217} h={21.253}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <SensorA width={16.699} height={16.699} />
        </div>
      </At>
      <At left={0} top={32.72} w={9.109} h={21.253}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ChevronRight width={16.699} height={16.699} />
        </div>
      </At>
      {/* 14px here, not the 10px the loops use — the water line label is larger. */}
      <p style={{ ...LABEL, left: 36.7, top: 0, fontSize: 14, lineHeight: '24.289px', letterSpacing: '0.14px' }}>Supply</p>
    </>
  )
}

function Loop({ valve, junction }) {
  const Pipe = junction ? OpenLoopPipe : ClosedLoopPipe
  return (
    <>
      <At left={6.51} top={23.09} w={83.494} h={47.711}>
        <Pipe width="100%" height="100%" preserveAspectRatio="none" />
      </At>
      <At left={48.8} top={13.33} w={16.265} h={16.265}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ValveStatus state={valve} size={11.836} />
        </div>
      </At>
      <At left={18.43} top={14.82} w={13.012} h={15.181}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <SensorA width={11.928} height={11.928} />
        </div>
      </At>
      <At left={0} top={15.16} w={6.506} h={15.181}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ChevronRight width={11.928} height={11.928} />
        </div>
      </At>
      <At left={0} top={63.04} w={5.422} h={15.181}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ChevronLeft width={11.928} height={11.928} />
        </div>
      </At>
      <At left={49.88} top={62.53} w={13.012} h={15.181}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <SensorB width={11.928} height={11.928} />
        </div>
      </At>
      <At left={17.35} top={60.77} w={16.265} h={16.265}>
        <div style={{ background: '#f2f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ValveStatus state={valve} size={11.836} />
        </div>
      </At>
      {junction && (
        <At left={80} top={40} w={20} h={14}>
          <Junction width="100%" height="100%" />
        </At>
      )}
      <p style={{ ...LABEL, left: 22, top: 0, fontSize: 10, lineHeight: '17.349px', letterSpacing: '0.1px' }}>Supply</p>
      <p style={{ ...LABEL, left: 22, top: 76, fontSize: 10, lineHeight: '17.349px', letterSpacing: '0.1px' }}>return</p>
    </>
  )
}

const TILE_W = 177
const TILE_H = 112

/**
 * @param topology 'water-line' | 'open-loop' | 'closed-loop'
 * @param valve    'open' | 'closed' | 'error' | 'unknown' | 'no-valve'
 * @param scale    1 = the designed 177x112. The schematic never reflows.
 */
export default function PipeTopology({
  topology = 'water-line',
  valve = 'open',
  scale = 1,
  className,
  ...props
}) {
  return (
    <div
      className={className}
      style={{
        width: TILE_W * scale,
        height: TILE_H * scale,
        background: '#f2f6ff',
        borderRadius: 12 * scale,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      {...props}
    >
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: 'top left', width: TILE_W, height: TILE_H }}>
        {topology === 'water-line'
          ? <WaterLine valve={valve} />
          : <Loop valve={valve} junction={topology === 'open-loop'} />}
      </div>
    </div>
  )
}
