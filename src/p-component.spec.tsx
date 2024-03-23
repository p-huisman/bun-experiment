import {PComponentElement} from "./p-component";
import fetchMock from "fetch-mock";

const waitForSelector = async (
  root: ShadowRoot,
  selector: string,
  timeout = 3000,
) => {
  let time = 0;
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      time += 100;
      const element = root.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      } else if (time > timeout) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for selector: ${selector}`));
      }
    }, 100);
    
  });
};

const pComponentTagName = "p-component";

describe("p-component custom element", () => {
  beforeAll(() => {
    fetchMock.mock("/api/greet", {message: "Hi"});
  });

  afterAll(() => {
    fetchMock.restore();
  });

  it("is defined", async () => {
    expect(PComponentElement).toBeDefined();
    await customElements.whenDefined(pComponentTagName);
  });

  describe("when no name attribute is set", () => {
    it("renders the default name", async () => {
      const element = document.createElement(pComponentTagName);
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      const greeting = (await waitForSelector(
        element.shadowRoot,
        ".greeting",
      )) as HTMLDivElement;
      expect(greeting.textContent).toBe("Hi P-COMPONENT");
      element.remove();
    });
  });

  describe("when a name attribute is set", () => {
    it("renders the provided name", async () => {
      const element = document.createElement(pComponentTagName);
      element.setAttribute("name", "TEST");
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      const greeting = (await waitForSelector(
        element.shadowRoot,
        ".greeting",
      )) as HTMLDivElement;
      expect(greeting.textContent).toBe("Hi TEST");
      element.remove();
    });
  });

  describe("when clicked", () => {
    it(" a clicked attribute is added", async () => {
      const element = document.createElement(pComponentTagName);
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      element.click();
      expect(element.hasAttribute("clicked")).toBeTrue();
      element.remove();
    });
  });

  describe("footer", () => {
    let element: PComponentElement;

    beforeEach(() => {
      element = document.createElement(pComponentTagName) as PComponentElement;
      const footerContent = document.createElement("div");
      footerContent.slot = "footer";
      footerContent.textContent = "FOOTER";
      element.appendChild(footerContent);
    });

    afterEach(() => {
      element.remove();
      jasmine.clock().uninstall();
    });

    it("renders a copyright sign and the current year in the footer", async () => {
      jasmine.clock().mockDate(new Date("2021-01-01"));
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      const footer = (await waitForSelector(
        element.shadowRoot,
        ".greeting-footer",
      )) as HTMLDivElement;
      expect(footer.textContent).toBe("© 2021");
    });

    it("renders slotted content", async () => {
      document.body.appendChild(element);
      await customElements.whenDefined(pComponentTagName);
      const slot = (await waitForSelector(
        element.shadowRoot,
        ".greeting-footer slot",
      )) as HTMLSlotElement;
      const slottedTextContent = slot
        .assignedNodes()
        .map((node) => node.textContent)
        .join("");
      expect(slottedTextContent).toBe("FOOTER");
    });
  });
});
