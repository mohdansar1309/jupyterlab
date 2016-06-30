// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  sendMessage
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  simulate
} from 'simulate-event';

import {
  CompletionWidget, CompletionModel, ICompletionItem
} from '../../../../lib/notebook/completion';


const TEST_ITEM_CLASS = 'jp-TestItem';

const ITEM_CLASS = 'jp-Completion-item';


class CustomRenderer extends CompletionWidget.Renderer {
  createItemNode(item: ICompletionItem): HTMLLIElement {
    let li = super.createItemNode(item);
    li.classList.add(TEST_ITEM_CLASS);
    return li;
  }
}


class LogWidget extends CompletionWidget {
  events: string[] = [];

  dispose(): void {
    super.dispose();
    this.events.length = 0;
  }

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }
}


class TestModel extends CompletionModel {
  setQuery(query: string): void {
    super.setQuery(query);
  }
}


describe('notebook/completion/widget', () => {

  describe('CompletionWidget', () => {

    describe('.createNode()', () => {

      it('should create node for a completion widget', () => {
        let node = CompletionWidget.createNode();
        expect(node.tagName.toLowerCase()).to.be('ul');
      });

    });

    describe('#constructor()', () => {

      it('should create a completion widget', () => {
        let widget = new CompletionWidget();
        expect(widget).to.be.a(CompletionWidget);
        expect(widget.node.classList).to.contain('jp-Completion');
      });

      it('should accept options with a model', () => {
        let options: CompletionWidget.IOptions = {
          model: new CompletionModel()
        };
        let widget = new CompletionWidget(options);
        expect(widget).to.be.a(CompletionWidget);
        expect(widget.model).to.equal(options.model);
      });

      it('should accept options with a renderer', () => {
        let options: CompletionWidget.IOptions = {
          model: new CompletionModel(),
          renderer: new CustomRenderer()
        };
        options.model.options = ['foo', 'bar'];

        let widget = new CompletionWidget(options);
        expect(widget).to.be.a(CompletionWidget);
        sendMessage(widget, Widget.MsgUpdateRequest);

        let items = widget.node.querySelectorAll(`.${ITEM_CLASS}`);
        expect(items).to.have.length(2);
        expect(items[0].classList).to.contain(TEST_ITEM_CLASS);
      });

    });

    describe('#selected', () => {

      it('should emit a signal when an item is selected', () => {
        let options: CompletionWidget.IOptions = {
          model: new CompletionModel(),
          reference: new Widget()
        };
        let value = '';
        let listener = (sender: any, selected: string) => { value = selected; };
        options.model.options = ['foo', 'bar'];
        options.reference.attach(document.body);

        let widget = new CompletionWidget(options);

        widget.selected.connect(listener);
        widget.attach(document.body);
        sendMessage(widget, Widget.MsgUpdateRequest);
        expect(value).to.be('');
        simulate(options.reference.node, 'keydown', { keyCode: 13 }); // Enter
        expect(value).to.be('foo');
        widget.dispose();
        options.reference.dispose();
      });

    });

    describe('#model', () => {

      it('should default to null', () => {
        let widget = new CompletionWidget();
        expect(widget.model).to.be(null);
      });

      it('should be settable', () => {
        let widget = new CompletionWidget();
        expect(widget.model).to.be(null);
        widget.model = new CompletionModel();
        expect(widget.model).to.be.a(CompletionModel);
      });

      it('should be safe to set multiple times', () => {
        let model = new CompletionModel();
        let widget = new CompletionWidget();
        widget.model = model;
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should be safe to reset', () => {
        let model = new CompletionModel();
        let widget = new CompletionWidget({ model: new CompletionModel() });
        expect(widget.model).not.to.be(model);
        widget.model = model;
        expect(widget.model).to.be(model);
      });

    });

    describe('#reference', () => {

      it('should default to null', () => {
        let widget = new CompletionWidget();
        expect(widget.reference).to.be(null);
      });

      it('should be settable', () => {
        let widget = new CompletionWidget();
        expect(widget.reference).to.be(null);
        widget.reference = new Widget();
        expect(widget.reference).to.be.a(Widget);
      });

      it('should be safe to reset', () => {
        let reference = new Widget();
        let widget = new CompletionWidget({ reference: new Widget() });
        expect(widget.reference).not.to.be(reference);
        widget.reference = reference;
        expect(widget.reference).to.be(reference);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CompletionWidget();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CompletionWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#handleEvent()', () => {

      it('should handle window keydown, mousedown, and scroll events', () => {
        let widget = new LogWidget();
        widget.attach(document.body);
        ['keydown', 'mousedown', 'scroll'].forEach(type => {
          simulate(window, type);
          expect(widget.events).to.contain(type);
        });
        widget.dispose();
      });

      context('mousedown', () => {

        it('should trigger a selected signal on mouse down', () => {
          let options: CompletionWidget.IOptions = {
            model: new TestModel(),
            reference: new Widget()
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          options.model.options = ['foo', 'bar', 'baz'];
          (options.model as TestModel).setQuery('b');
          options.reference.attach(document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          widget.attach(document.body);
          sendMessage(widget, Widget.MsgUpdateRequest);

          let items = widget.node.querySelectorAll(`.${ITEM_CLASS} mark`);

          expect(value).to.be('');
          simulate(items[1], 'mousedown');
          expect(value).to.be('baz');
          widget.dispose();
          options.reference.dispose();
        });

        it('should ignore a mouse down that misses an item', () => {
          let options: CompletionWidget.IOptions = {
            model: new CompletionModel(),
            reference: new Widget()
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          options.model.options = ['foo', 'bar'];
          options.reference.attach(document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          widget.attach(document.body);
          sendMessage(widget, Widget.MsgUpdateRequest);
          expect(value).to.be('');
          simulate(widget.node, 'mousedown');
          expect(value).to.be('');
          widget.dispose();
          options.reference.dispose();
        });

        it('should hide widget if mouse down misses it', (done) => {
          let options: CompletionWidget.IOptions = {
            model: new CompletionModel(),
            reference: new Widget()
          };
          let value = '';
          let listener = (sender: any, selected: string) => {
            value = selected;
          };
          options.model.options = ['foo', 'bar'];
          options.reference.attach(document.body);

          let widget = new CompletionWidget(options);

          widget.selected.connect(listener);
          widget.attach(document.body);
          sendMessage(widget, Widget.MsgUpdateRequest);
          expect(widget.isHidden).to.be(false);
          simulate(options.reference.node, 'mousedown');
          requestAnimationFrame(() => {
            expect(widget.isHidden).to.be(true);
            widget.dispose();
            options.reference.dispose();
            done();
          });
        });

      });

    });

  });

});
