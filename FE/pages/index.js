import Interface from "../components/interface";
import Script from "next/script";
const Index = () => {
return(
    <div>
        <h1> Index</h1>
        <Script src="/js/snarkjs.min.js" />
        <Interface />
    </div>
)
}

export default Index;
