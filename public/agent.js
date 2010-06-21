uki(
{ view: 'HSplitPane', rect: '1000 800', anchors: 'left top right bottom',
    handlePosition: 150, leftMin: 150, rightMin: 500, handleWidth: 1,
    leftChildViews: {
        view: 'VSplitPane', rect: '150 800',
        anchors: 'top left right bottom', handleWidth: 10,
        handlePosition: 400, leftMin: 100, rightMin: 100,
        topChildViews: [
            { view: 'Box', rect: '150 30',
              anchors: 'top left right',
              background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
              childViews: [
                  { view: 'Label', rect: '10 0 150 30',
                    anchors: 'top left right bottom', html: 'Active Users' }
              ]
            },
            { view: 'ScrollableList', rect: '0 30 150 360',
              anchors: 'top left right bottom', id: 'active-users'
            }
        ],
        bottomChildViews: [
            { view: 'Box', rect: '150 30',
              anchors: 'top left right',
              background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
              childViews: [
                  { view: 'Label', rect: '10 0 150 30',
                    anchors: 'top left right bottom', html: 'Guests You\'re Assisting' }
              ]
            },
            { view: 'ScrollableList', rect: '0 30 150 360',
              anchors: 'top left right bottom', id: 'helping'
            }
        ]
    },
    rightChildViews: [
        { view: 'VSplitPane', rect: '850 800',
          anchors: 'left top right bottom', handleWidth: 1,
          handlePosition: 700, leftMin: 400, rightMin: 100,
          topChildViews: [
              { view: 'Box', rect: '850 100',
                anchors: 'top left right', id: 'info',
                background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
                textSelectable: true
              },
              { view: 'Box', rect: '0 100 850 600',
                anchors: 'top left right bottom', id: 'messages',
                background: '#fff', textSelectable: true
              }
          ],
          bottomPane: { background: '#fff', id: 'chatbox', childViews: [
                { view: 'MultilineTextField', rect: '10 10 740 80',
                  anchors: 'top left right bottom', name: 'body', id: 'body'
                },
                { view: 'Button', rect: '760 10 80 80', text: 'Send',
                  anchors: 'top right', id: 'send'
                }
          ] }
        }
   ]
}).attachTo(window, '1000 800', {minSize: '300 0'});

/*
for(var i = 0; i < 50; i++)
    uki('#helping>List').addRow(0, '<strong>text</strong>');
*/

var AgentChat = function(agent) {
    $.ajaxSetup({cache: false});

    this.agent = agent;
    this.listen();
};

$.extend(AgentChat.prototype, {
    listen: function() {
        var self = this;
        $.getJSON('/listen', function(data) {
            $('#messages').append($('<p>').html(JSON.stringify(data)));
            
            setTimeout(function() {
                self.listen();
            }, 0);
        });
    }
});

$(function() {
    new AgentChat('');
});
