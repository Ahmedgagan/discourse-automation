import Controller from "@ember/controller";
import { action, computed, set } from "@ember/object";
import { extractError } from "discourse/lib/ajax-error";
import { schedule } from "@ember/runloop";
import { filterBy, reads } from "@ember/object/computed";
import { ajax } from "discourse/lib/ajax";
import I18n from "I18n";
import bootbox from "bootbox";

export default class AutomationEdit extends Controller {
  error = null;
  isUpdatingAutomation = false;
  isTriggeringAutomation = false;

  @reads("model.automation") automation;
  @filterBy("automationForm.fields", "target", "script") scriptFields;
  @filterBy("automationForm.fields", "target", "trigger") triggerFields;

  @computed("model.automation.next_pending_automation_at")
  get nextPendingAutomationAtFormatted() {
    const date = this.model?.automation?.next_pending_automation_at;
    if (date) {
      return moment(date).format("LLLL");
    }
  }

  @action
  saveAutomation() {
    this.setProperties({ error: null, isUpdatingAutomation: true });

    return ajax(
      `/admin/plugins/discourse-automation/automations/${this.model.automation.id}.json`,
      {
        type: "PUT",
        data: JSON.stringify({ automation: this.automationForm }),
        dataType: "json",
        contentType: "application/json",
      }
    )
      .then(() => {
        this.send("refreshRoute");
      })
      .catch((e) => this._showError(e))
      .finally(() => {
        this.set("isUpdatingAutomation", false);
      });
  }

  @action
  onChangeField(field, identifier, value) {
    set(field, `metadata.${identifier}`, value);
  }

  @action
  onChangeTrigger(id) {
    if (this.automationForm.trigger && this.automationForm.trigger !== id) {
      this._confirmReset(() => {
        set(this.automationForm, "trigger", id);
        this.saveAutomation();
      });
    } else if (!this.automationForm.trigger) {
      set(this.automationForm, "trigger", id);
      this.saveAutomation();
    }
  }

  @action
  onManualAutomationTrigger(id) {
    this._confirmTrigger(() => {
      this.set("isTriggeringAutomation", true);

      return ajax(`/automations/${id}/trigger.json`, {
        type: "post",
      })
        .catch((e) => this.set("error", extractError(e)))
        .finally(() => {
          this.set("isTriggeringAutomation", false);
        });
    });
  }

  @action
  onChangeScript(id) {
    if (this.automationForm.script !== id) {
      this._confirmReset(() => {
        set(this.automationForm, "script", id);
        this.saveAutomation();
      });
    }
  }

  _confirmReset(callback) {
    bootbox.confirm(
      I18n.t("discourse_automation.confirm_automation_reset"),
      I18n.t("no_value"),
      I18n.t("yes_value"),
      (result) => {
        if (result) {
          callback && callback();
        }
      }
    );
  }

  _confirmTrigger(callback) {
    bootbox.confirm(
      I18n.t("discourse_automation.confirm_automation_trigger"),
      I18n.t("no_value"),
      I18n.t("yes_value"),
      (result) => {
        if (result) {
          callback && callback();
        }
      }
    );
  }

  _showError(error) {
    this.set("error", extractError(error));

    schedule("afterRender", () => {
      window.scrollTo(0, 0);
    });
  }
}
