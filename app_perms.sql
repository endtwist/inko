INSERT INTO `auth_group` (name) VALUES('Live Chat Agent');
INSERT INTO `auth_group` (name) VALUES('Live Chat Room Monitor');

INSERT INTO `auth_permission` (name, content_type_id, codename) VALUES('Can monitor Live Chat room', 1, 'monitor_live_chat');
INSERT INTO `auth_permission` (name, content_type_id, codename) VALUES('Can act as a Live Chat agent', 1, 'agent_live_chat');

INSERT INTO `auth_group_permissions` (group_id, permission_id) VALUES(
    (SELECT id FROM `auth_group` WHERE name='Live Chat Agent' LIMIT 1),
    (SELECT id FROM `auth_permission` WHERE codename='agent_live_chat' LIMIT 1)
);
INSERT INTO `auth_group_permissions` (group_id, permission_id) VALUES(
    (SELECT id FROM `auth_group` WHERE name='Live Chat Room Monitor' LIMIT 1),
    (SELECT id FROM `auth_permission` WHERE codename='monitor_live_chat' LIMIT 1)
);