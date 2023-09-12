import css from "./dummy-component.css";

@CustomElementConfig({
  tagName: "p-dummy",
})
export class PDummyElement extends CustomElement {
  constructor() {
    super();
    const template = this.templateFromString(
      `<style>${css}</style><div></div>`,
      true
    );
    this.shadowRoot?.appendChild(template);
    const rootElement = this.shadowRoot.querySelector("div");
    this.createProjector(rootElement, this.render);
  }

  private render = (): VNode => {
    return <div>Hello {this.name}</div>;
  }

  static get observedAttributes(): string[] {
    return ["name"]
  }

  @RenderOnSet
  public name = "World";

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this.name = newValue
  }

}
