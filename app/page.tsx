import Cube from "./cube";
import "./landing.css";

export default function Home() {
  return (
    <div className="landing">
      <Cube />
      <div>
        chaidhat chaimongkol
        <br />
        <br />
        <a href="https://www.linkedin.com/in/chaidhat">linkedin</a>
        <br />
        <a href="https://github.com/chaidhat">github</a>
        <br />
        <a href="/resume.pdf">resume</a>
        <br />
        <br />
        <a href="https://quantum.chaidhat.com">quantum</a>
        <br />
        <a href="/blog">blog</a>
      </div>
    </div>
  );
}
